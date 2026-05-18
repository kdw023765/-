import httpx


class ComputeNodeClient:

    def __init__(self, node_id: int, host: str):
        self.node_id = node_id
        self.host = host

    async def analyze(self, segment_path: str, offset: float):

        payload = {
            "nodeIndex": self.node_id,
            "videoName": f"segment_{self.node_id}.mp4",
            "videoUrl": segment_path,
            "startOffsetSec": offset,
            "originVideoId": "OriginVideo"
        }

        async with httpx.AsyncClient(timeout=300) as client:
            response = await client.post(
                f"{self.host}/analyze",
                json=payload
            )

            response.raise_for_status()

            return response.json()
