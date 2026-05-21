import os
import subprocess


class HighlightVideoGenerator:

    def __init__(self, output_dir: str = "highlights"):

        self.output_dir = output_dir

        os.makedirs(output_dir, exist_ok=True)

    def generate(self, origin_video: str, all_result: list):

        clips = []

        for index, goal in enumerate(all_result):

            start = max(goal["globalTimeSec"] - 10, 0)
            end = goal["globalTimeSec"] + 10

            output_clip = os.path.join(
                self.output_dir,
                f"clip_{index}.mp4"
            )

            subprocess.run([
                "ffmpeg",
                "-y",
                "-ss",
                str(start),
                "-to",
                str(end),
                "-i",
                origin_video,
                "-c",
                "copy",
                output_clip
            ])

            clips.append(output_clip)

        concat_file = os.path.join(
            self.output_dir,
            "concat.txt"
        )

        with open(concat_file, "w") as file:

            for clip in clips:
                file.write(f"file '{clip}'\n")

        final_output = os.path.join(
            self.output_dir,
            "final_highlight.mp4"
        )

        subprocess.run([
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            concat_file,
            "-c",
            "copy",
            final_output
        ])

        return final_output
