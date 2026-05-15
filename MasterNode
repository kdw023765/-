class MasterNode:
    def handle_video_request(self, OriginVideo, total_duration_minutes):
        # 1. 영상 3등분 계산 (예: 10분 -> 3.3, 3.3, 3.4)
        part_duration = round(total_duration_minutes / 3, 1)
        dur_1 = part_duration
        dur_2 = part_duration
        dur_3 = round(total_duration_minutes - (dur_1 + dur_2), 1)

        # 분할된 영상 변수
        OneVideo = f"{OriginVideo}_part1"
        TwoVideo = f"{OriginVideo}_part2"
        ThreeVideo = f"{OriginVideo}_part3"

        # 2. 오프셋(기준 시간) 계산
        # 오프셋을 컴퓨트노드들한테 알려주어야 시간 계산 가능
        offset_1 = 0.0
        offset_2 = dur_1
        offset_3 = round(dur_1 + dur_2, 1)

        # 3. 컴퓨트노드들에게 영상 및 오프셋 전달 후 결과 수신
        # (병합후에는 gRPC, REST API, Message Queue 등을 통해 컴퓨트노드 호출), 지역로컬 사용 예정.
        OneResult = self.send_to_compute_node(node_id=1, video=OneVideo, offset=offset_1)
        TwoResult = self.send_to_compute_node(node_id=2, video=TwoVideo, offset=offset_2)
        ThreeResult = self.send_to_compute_node(node_id=3, video=ThreeVideo, offset=offset_3)

        # 4. 결과 병합 (ALLResult)
        ALLResult = sorted(OneResult + TwoResult + ThreeResult)

        # 5. BackendAPI로 병합된 결과 전달
        return ALLResult

    def send_to_compute_node(self, node_id, video, offset):
        """
        컴퓨트노드와 통신하여 영상(video)을 보내고, 
        컴퓨트노드가 OriginAPI를 돌려 찾은 시간에 offset을 더한 결과를 받아오는 함수
        """
        # return 예시: [1.3, 4.3, 5.6...] (오프셋이 반영된 절대 시간 배열)
        return []
