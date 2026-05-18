import asyncio
import httpx
from typing import List, Dict, Any

# 다른 파일에 정의된 Pydantic 모델 로드 (경로에 맞게 import)
from models import HighlightResult, GoalEvent

# 각 컴퓨트 노드의 실제 배치 주소 (네트워크 환경에 맞게 포트/도메인 변경 가능)
COMPUTE_NODE_URLS = {
    1: "http://localhost:8001/analyze",
    2: "http://localhost:8002/analyze",
    3: "http://localhost:8003/analyze",
}


class MasterNode:
    async def handle_video_request(self, origin_video_id: str, total_duration_minutes: float, job_id: str = "job_default") -> Dict[str, Any]:
        """
        영상을 3등분하여 메타데이터를 만들고, 컴퓨트 노드들을 비동기 병렬로 호출한 뒤,
        결과를 수신 및 정렬하여 백엔드 스키마(HighlightResult) 규격으로 반환합니다.
        """
        # 1. 영상 3등분 계산 (분 단위 유지)
        part_duration = round(total_duration_minutes / 3, 1)
        dur_1 = part_duration
        dur_2 = part_duration
        dur_3 = round(total_duration_minutes - (dur_1 + dur_2), 1)

        # 분할될 영상 명명 규칙 (compute_node에서 검증하는 이름 포맷 반영)
        OneVideo = f"{origin_video_id}_part1"
        TwoVideo = f"{origin_video_id}_part2"
        ThreeVideo = f"{origin_video_id}_part3"

        # 2. 오프셋(기준 시간) 계산 및 단위 보정 (★중요 버그 수정: 분 -> 초 변환)
        # compute_node.py는 초 단위(startOffsetSec)를 기대하므로 60을 곱해줍니다.
        offset_sec_1 = 0.0 * 60
        offset_sec_2 = dur_1 * 60
        offset_sec_3 = round(dur_1 + dur_2, 1) * 60

        # MasterNode의 스토리지 환경에서 분할 영상들이 호스팅되는 모의 URL 주소
        video_url_1 = f"http://master-node/videos/{OneVideo}.mp4"
        video_url_2 = f"http://master-node/videos/{TwoVideo}.mp4"
        video_url_3 = f"http://master-node/videos/{ThreeVideo}.mp4"

        # 3. 컴퓨트노드들에게 영상 및 오프셋 전달 후 결과 수신 (★성능 고도화: 비동기 병렬 처리)
        # 기존의 순차(동기) 호출 방식을 asyncio.gather를 통한 동시 호출 방식으로 전환하여 대기 시간 3배 단축
        tasks = [
            self.send_to_compute_node(1, OneVideo, video_url_1, offset_sec_1, origin_video_id),
            self.send_to_compute_node(2, TwoVideo, video_url_2, offset_sec_2, origin_video_id),
            self.send_to_compute_node(3, ThreeVideo, video_url_3, offset_sec_3, origin_video_id),
        ]
        
        # 3개 노드의 네트워크 AI 분석 응답을 동시에 대기
        node_responses = await asyncio.gather(*tasks, return_exceptions=True)

        all_events: List[GoalEvent] = []

        # 4. 결과 병합 및 데이터 포맷 변환 (ComputeNode 데이터 -> models.py 규격)
        for i, response in enumerate(node_responses):
            node_id = i + 1
            if isinstance(response, Exception):
                print(f"[MasterNode] 컴퓨트 노드 {node_id} 통신/처리 중 예외 발생: {response}")
                continue
            
            if response.get("status") != "success":
                print(f"[MasterNode] 컴퓨트 노드 {node_id} 분석 실패 원인: {response.get('error')}")
                continue

            # ComputeNode의 성공 결과(goals) 순회 처리
            for goal in response.get("goals", []):
                global_time_sec = goal["globalTimeSec"]
                
                # models.py의 GoalEvent 스키마에 맞추기 위해 다시 분(Minutes) 단위로 역산
                timestamp_minutes = round(global_time_sec / 60, 2)
                
                # 표기용 포맷팅 (예: 260초 -> "4분 20초")
                minutes, seconds = divmod(round(global_time_sec), 60)
                timestamp_str = f"{minutes}분 {seconds}초"

                # Pydantic 모델 인스턴스 생성
                event = GoalEvent(
                    timestamp_minutes=timestamp_minutes,
                    timestamp_str=timestamp_str,
                    segment_index=node_id - 1,  # 0-based index
                    confidence=goal["confidence"],
                    description=goal.get("description")
                )
                all_events.append(event)

        # 전체 하이라이트 이벤트를 시간 순서(분 기준)로 오름차순 정렬
        all_events.sort(key=lambda x: x.timestamp_minutes)

        # 5. BackendAPI가 수신할 최종 결과 객체(HighlightResult) 빌드
        final_result = HighlightResult(
            job_id=job_id,
            total_duration_minutes=total_duration_minutes,
            highlights=all_events,
            segment_count=3
        )

        # 백엔드 서버나 API 응답으로 내보낼 수 있도록 딕셔너리로 직렬화하여 반환
        return final_result.model_dump()

    async def send_to_compute_node(self, node_id: int, video_name: str, video_url: str, offset_sec: float, origin_video_id: str) -> Dict[str, Any]:
        """
        HTTP 통신을 통해 개별 ComputeNode의 /analyze 엔드포인트를 호출하는 함수입니다.
        """
        url = COMPUTE_NODE_URLS.get(node_id)
        if not url:
            return {"nodeIndex": node_id, "status": "failed", "error": f"유효하지 않은 노드 번호: {node_id}"}

        # compute_node.py의 ComputeAnalysisRequest 검증 스키마와 1:1 완벽 대응하는 페이로드
        payload = {
            "nodeIndex": node_id,
            "videoName": video_name,
            "videoUrl": video_url,
            "startOffsetSec": offset_sec,
            "originVideoId": origin_video_id
        }

        try:
            # 대용량 처리를 감안하여 타임아웃을 300초(5분)로 넉넉하게 설정
            async with httpx.AsyncClient(timeout=300.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                return response.json()  # ComputeAnalysisResponse 형태의 딕셔너리 반환
        except Exception as e:
            # 특정 노드 통신 실패가 전체 마스터 노드 크래시로 이어지지 않도록 예외 캡슐화
            return {
                "nodeIndex": node_id,
                "status": "failed",
                "error": f"컴퓨트 노드 네트워크 통신 실패: {str(e)}",
                "goals": []
            }
