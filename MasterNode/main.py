import asyncio

from splitter import VideoSplitter
from merger import merge_goal_results
from compute_node_client import ComputeNodeClient


class MasterNode:

    def __init__(self):

        self.nodes = [
            ComputeNodeClient(
                node_id=1,
                host="http://192.168.0.101:8001"
            ),
            ComputeNodeClient(
                node_id=2,
                host="http://192.168.0.102:8002"
            ),
            ComputeNodeClient(
                node_id=3,
                host="http://192.168.0.103:8003"
            )
        ]

    async def process(self, input_path: str):

        splitter = VideoSplitter()

        segments = splitter.split(input_path)

        tasks = []

        for node, segment in zip(self.nodes, segments):

            tasks.append(
                node.analyze(
                    segment_path=segment["path"],
                    offset=segment["offset"]
                )
            )

        results = await asyncio.gather(*tasks)

        return merge_goal_results(results)
