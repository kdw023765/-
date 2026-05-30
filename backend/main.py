"""
Backend API Server
- FrontWeb에서 영상을 받아 MasterNode로 전달
- MasterNode로부터 하이라이트 결과를 수신하여 FrontWeb에 반환
"""

import os
import uuid
import httpx
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from config import settings
from models import JobStatus, HighlightResult, JobResponse
from job_store import job_store

UPLOAD_DIR = os.path.abspath("uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[BackendAPI] 서버 시작 - MasterNode: {settings.MASTER_NODE_URL}")
    yield
    print("[BackendAPI] 서버 종료")


app = FastAPI(
    title="Video Highlight Backend API",
    description="영상 하이라이트 추출 분산처리 백엔드",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


def _safe_extension(filename: str | None) -> str:
    if not filename or "." not in filename:
        return ".mp4"

    extension = os.path.splitext(filename)[1].lower()
    if extension in {".mp4", ".mov", ".webm", ".mkv", ".avi"}:
        return extension

    return ".mp4"


# ──────────────────────────────────────────────
# 1. FrontWeb → BackendAPI: 영상 업로드
# ──────────────────────────────────────────────
@app.post("/api/upload", response_model=JobResponse, summary="영상 업로드 및 처리 시작")
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """
    FrontWeb에서 영상을 업로드받아 MasterNode로 전달하고 job_id를 반환합니다.
    """
    # 파일 형식 검증
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="영상 파일만 업로드 가능합니다.")

    job_id = str(uuid.uuid4())
    video_bytes = await file.read()

    extension = _safe_extension(file.filename)
    stored_filename = f"{job_id}{extension}"
    stored_path = os.path.join(UPLOAD_DIR, stored_filename)

    with open(stored_path, "wb") as uploaded_video:
        uploaded_video.write(video_bytes)

    video_url = f"/uploads/{stored_filename}"

    # job 등록
    job_store.create(job_id, filename=file.filename, video_url=video_url)

    # MasterNode 전송을 백그라운드로 처리
    background_tasks.add_task(
        _forward_to_master,
        job_id=job_id,
        video_bytes=video_bytes,
        filename=file.filename,
        content_type=file.content_type,
    )

    return JobResponse(
        job_id=job_id,
        status=JobStatus.PENDING,
        message="영상이 접수되었습니다. 처리 중입니다.",
        video_url=video_url,
    )


# ──────────────────────────────────────────────
# 2. FrontWeb → BackendAPI: 처리 상태 조회 (Polling)
# ──────────────────────────────────────────────
@app.get("/api/status/{job_id}", response_model=JobResponse, summary="처리 상태 조회")
async def get_status(job_id: str):
    """
    job_id로 현재 처리 상태와 결과를 조회합니다.
    """
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 job_id입니다.")
    return job


# ──────────────────────────────────────────────
# 3. MasterNode → BackendAPI: 하이라이트 결과 수신
# ──────────────────────────────────────────────
@app.post("/api/result/{job_id}", summary="MasterNode로부터 결과 수신 (내부용)")
async def receive_result(job_id: str, result: HighlightResult):
    """
    MasterNode가 병합 완료 후 최종 하이라이트 결과를 전송하는 엔드포인트입니다.
    """
    job = job_store.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="존재하지 않는 job_id입니다.")

    job_store.update_result(job_id, result)
    print(f"[BackendAPI] job={job_id} 결과 수신 완료, 하이라이트 {len(result.highlights)}개")
    return {"message": "결과 저장 완료"}


# ──────────────────────────────────────────────
# 내부: MasterNode로 영상 전송
# ──────────────────────────────────────────────
async def _forward_to_master(
    job_id: str,
    video_bytes: bytes,
    filename: str,
    content_type: str,
):
    """
    영상 바이트를 MasterNode의 /process 엔드포인트로 multipart 전송합니다.
    """
    job_store.update_status(job_id, JobStatus.PROCESSING)
    try:
        async with httpx.AsyncClient(timeout=settings.MASTER_TIMEOUT) as client:
            response = await client.post(
                f"{settings.MASTER_NODE_URL}/process",
                files={"file": (filename, video_bytes, content_type)},
                data={
                    "job_id": job_id,
                    "callback_url": f"{settings.BACKEND_URL}/api/result/{job_id}",
                },
            )
            response.raise_for_status()
            print(f"[BackendAPI] job={job_id} MasterNode 전달 완료")

    except httpx.HTTPStatusError as e:
        _handle_error(job_id, f"MasterNode HTTP 오류: {e.response.status_code}")
    except httpx.RequestError as e:
        _handle_error(job_id, f"MasterNode 연결 실패: {str(e)}")
    except Exception as e:
        _handle_error(job_id, f"알 수 없는 오류: {str(e)}")


def _handle_error(job_id: str, message: str):
    print(f"[BackendAPI] ERROR job={job_id}: {message}")
    job_store.update_status(job_id, JobStatus.FAILED, error=message)
