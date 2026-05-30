"""
Job 상태 저장소 (In-Memory)
실제 운영 시 Redis 등으로 교체 가능
"""
import threading
from typing import Optional

from models import JobStatus, JobResponse, HighlightResult


class JobStore:
    def __init__(self):
        self._store: dict[str, JobResponse] = {}
        self._lock = threading.Lock()

    def create(
        self,
        job_id: str,
        filename: Optional[str] = None,
        video_url: Optional[str] = None,
    ) -> JobResponse:
        job = JobResponse(
            job_id=job_id,
            status=JobStatus.PENDING,
            message=f"'{filename}' 업로드 완료, 처리 대기 중",
            video_url=video_url,
        )
        with self._lock:
            self._store[job_id] = job
        return job

    def get(self, job_id: str) -> Optional[JobResponse]:
        with self._lock:
            return self._store.get(job_id)

    def update_status(
        self,
        job_id: str,
        status: JobStatus,
        error: Optional[str] = None,
    ):
        with self._lock:
            job = self._store.get(job_id)
            if job:
                job.status = status
                if error:
                    job.error = error

    def update_result(self, job_id: str, result: HighlightResult):
        with self._lock:
            job = self._store.get(job_id)
            if job:
                job.status = JobStatus.DONE
                job.result = result
                job.message = f"처리 완료: 하이라이트 {len(result.highlights)}개 발견"


# 싱글턴
job_store = JobStore()
