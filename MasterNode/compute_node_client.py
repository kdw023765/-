import asyncio

import httpx


class ComputeNodeClient:

    def __init__(self, node_id: int, host: str):
        self.node_id = node_id
        self.host = host

    async def analyze(self, segment_path: str, offset: float):

        retries = 2

        for attempt in range(retries):

            try:

                with open(segment_path, "rb") as video_file:

                    files = {
                        "video": (
                            f"segment_{self.node_id}.mp4",
                            video_file,
                            "video/mp4"
                        )
                    }

                    data = {
                        "nodeIndex": str(self.node_id),
                        "startOffsetSec": str(offset),
                        "originVideoId": "OriginVideo"
                    }

                    async with httpx.AsyncClient(timeout=300) as client:

                        response = await client.post(
                            f"{self.host}/analyze",
                            files=files,
                            data=data
                        )

                        response.raise_for_status()

                        return response.json()

            except Exception:

                if attempt == retries - 1:
                    raise

                await asyncio.sleep(2)
