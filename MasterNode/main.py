import asyncio
import logging
import httpx
from typing import list

from models import HighlightResult, GoalEvent
from config import settings

logger = logging.getLogger(__name__)

# 각 컴퓨트 노드의 주소 설정 (환경에 맞게 포트나 도메인 변경 가능)
COMPUTE_NODE_URLS = {
    1: "http://localhost:8001/analyze",
    2: "http://localhost:8002/analyze",
    3: "http://localhost:8003/analyze",
}

class MasterNode:
    async def handle_video_request(
        self, 
        job_id: str, 
        origin_video_id: str, 
        total_duration_seconds: float, 
        segment_urls: list[str]
    ) -> HighlightResult:
        """
        원본 영상을 3등분하여 컴퓨트 노드들에게 비동기 병렬로 분석을 요청하고,
        전체 결과를 초 단위로 보정 및 병합하여 최종 HighlightResult를 반환합니다.
        """
        # 1. 영상 3등분 계산 (초 단위 통일)
        part_duration = round(total_duration_seconds / 3, 1)
        dur_1 = part_duration
        dur_2 = part_duration
        dur_3 = round(total_duration_seconds - (dur_1 + dur_2), 1)

        # 2. 오프셋(기준 시간) 계산 (초 단위)
        offset_1 = 0.0
        offset_2 = dur_1
        offset_3 = round(dur_1 + dur_2, 1)
        offsets = [offset_1, offset_2, offset_3]

        video_names = ["OneVideo", "TwoVideo", "ThreeVideo"]

        # 3. 비동기 클라이언트를 사용해 컴퓨트 노드들로 병렬 요청 전송
        tasks = []
        for i in range(3):
            node_id = i + 1
            tasks.append(
                self.send_to_compute_node(
                    node_id=node_id,
                    video_name=video_names[i],
                    video_url=segment_urls[i],
                    offset_sec=offsets[i],
                    origin_video_id=origin_video_id
                )
            )

        # asyncio.gather로 3개의 태스크를 동시에 실행 (병렬 처리)
        logger.info(f"[Job {job_id}] 3개의 컴퓨트 노드에 병렬 분석 요청을 시작합니다.")
        raw_results = await asyncio.gather(*tasks, return_exceptions=True)

        # 4. 결과 병합 및 모델 변환 (ALLResult)
        all_highlights: list[GoalEvent] = []

        for idx, res in enumerate(raw_results):
            segment_index = idx  # 0-based index
            
            # 예외 발생 처리
            if isinstance(res, Exception):
                logger.error(f"컴퓨트 노드 {segment_index + 1} 처리 중 예외 발생: {res}")
                continue
            
            # 성공 응답 확인
            if res and res.get("status") == "success":
                for goal in res.get("goals", []):
                    global_sec = goal["globalTimeSec"]
                    
                    # models.py 요구사항에 맞게 분(Minutes) 단위로 변환
                    timestamp_minutes = round(global_sec / 60.0, 2)
                    
                    # 표시용 문자열 생성 (예: '4분 18초')
                    m, s = divmod(round(global_sec), 60)
                    h, m = divmod(m, 60)
                    timestamp_str = f"{h}시간 {m}분 {s}초" if h > 0 else f"{m}분 {s}초"

                    event = GoalEvent(
                        timestamp_minutes=timestamp_minutes,
                        timestamp_str=timestamp_str,
                        segment_index=segment_index,
                        confidence=goal["confidence"],
                        description=goal.get("description")
                    )
                    all_highlights.append(event)
            else:
                error_msg = res.get("error") if res else "Unknown Error"
                logger.error(f"컴퓨트 노드 {segment_index + 1} 분석 실패: {error_msg}")

        # 전체 하이라이트 시간을 원본 영상 기준 절대 시간으로 정렬
        all_highlights.sort(key=lambda x: x.timestamp_minutes)

        # 5. 최종 결과 반환
        total_duration_minutes = round(total_duration_seconds / 60.0, 2)
        return HighlightResult(
            job_id=job_id,
            total_duration_minutes=total_duration_minutes,
            highlights=all_highlights,
            segment_count=3
        )

    async def send_to_compute_node(
        self, 
        node_id: int, 
        video_name: str, 
        video_url: str, 
        offset_sec: float, 
        origin_video_id: str
    ) -> dict | None:
        """
        개별 컴퓨트 노드에 HTTP POST로 분석을 요청하는 비동기 함수입니다.
        """
        url = COMPUTE_NODE_URLS.get(node_id)
        if not url:
            logger.error(f"노드 {node_id}에 해당하는 URL 설정이 없습니다.")
            return None

        # compute_node.py의 ComputeAnalysisRequest 스키마에 맞춤
        payload = {
            "nodeIndex": node_id,
            "videoName": video_name,
            "videoUrl": video_url,
            "startOffsetSec": offset_sec,
            "originVideoId": origin_video_id
        }

        # 대용량 영상 처리를 고려해 config에 정의된 대기 시간 타임아웃 적용
        timeout = httpx.Timeout(settings.MASTER_TIMEOUT, connect=10.0)

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                return response.json()  # ComputeAnalysisResponse 형태의 딕셔너리 반환
        except httpx.HTTPStatusError as e:
            logger.error(f"컴퓨트 노드 {node_id} HTTP 에러 ({e.response.status_code})")
            return {"status": "failed", "error": f"HTTP {e.response.status_code}"}
        except httpx.RequestError as e:
            logger.error(f"컴퓨트 노드 {node_id} 연결 실패: {e}")
            return {"status": "failed", "error": f"Connection failed: {e}"}
