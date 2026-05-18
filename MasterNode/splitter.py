import os
import subprocess
from moviepy.editor import VideoFileClip


class VideoSplitter:

    def __init__(self, output_dir="storage/chunks"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def split(self, input_path: str):

        clip = VideoFileClip(input_path)
        duration = int(clip.duration)

        chunk_duration = duration // 3

        results = []

        for index in range(3):

            start = index * chunk_duration

            if index == 2:
                end = duration
            else:
                end = (index + 1) * chunk_duration

            output_path = os.path.join(
                self.output_dir,
                f"segment_{index + 1}.mp4"
            )
    cmd = [
                "ffmpeg",
                "-i",
                input_path,
                "-ss",
                str(start),
                "-to",
                str(end),
                "-c",
                "copy",
                output_path,
                "-y"
            ]

            subprocess.run(cmd)

            results.append({
                "segment_index": index,
                "path": output_path,
                "offset": start
            })

        return results
