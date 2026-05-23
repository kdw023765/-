import asyncio

from splitter import VideoSplitter
from merger import merge_goal_results
from compute_node_client import ComputeNodeClient
from result_formatter import ResultFormatter
from highlight_video_generator import HighlightVideoGenerator


class MasterNode:

    def __init__(self):

        self.nodes = [
            ComputeNodeClient(
                node_id=1,
                host="http://127.0.0.1:9101"
            ),
            ComputeNodeClient(
                node_id=2,
                host="http://127.0.0.1:9102"
            ),
            ComputeNodeClient(
                node_id=3,
                host="http://127.0.0.1:9103"
            )
        ]

        self.formatter = ResultFormatter()

        self.highlight_generator = (
            HighlightVideoGenerator()
        )

    async def process(self, input_path: str, options: dict):

        splitter = VideoSplitter()

        segments = splitter.split(
            input_path,
            segment_count=len(self.nodes)
        )

        tasks = []

        for node, segment in zip(self.nodes, segments):

            tasks.append(
                node.analyze(
                    segment_path=segment["path"],
                    offset=segment["offset"]
                )
            )

        results = await asyncio.gather(
            *tasks,
            return_exceptions=True
        )

        valid_results = []

        for result in results:

            if isinstance(result, Exception):
                print("노드 실패:", result)
                continue

            valid_results.append(result)

        merged = merge_goal_results(valid_results)

        formatted = self.formatter.format(
            merged,
            options
        )

        formatted["ALLResult"] = merged
        formatted["highlightVideo"] = None

        if merged:
            formatted["highlightVideo"] = (
                self.highlight_generator.generate(
                    input_path,
                    merged
                )
            )
        else:
            print("하이라이트 없음: 감지된 골 장면이 없습니다.")

        return formatted
