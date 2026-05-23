import os
import subprocess


class HighlightVideoGenerator:

    def __init__(self, output_dir: str = "highlights"):

        self.output_dir = output_dir

        os.makedirs(output_dir, exist_ok=True)

    def generate(self, origin_video: str, all_result: list):

        clips = []

        for index, goal in enumerate(all_result):

            start = max(float(goal["globalTimeSec"]) - 10, 0)
            end = float(goal["globalTimeSec"]) + 10

            output_clip = os.path.abspath(os.path.join(
                self.output_dir,
                f"clip_{index}.mp4"
            ))

            result = subprocess.run([
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

            if result.returncode != 0:
                raise RuntimeError(f"하이라이트 클립 생성 실패: {output_clip}")

            clips.append(output_clip)

        if not clips:
            raise RuntimeError("생성할 하이라이트 클립이 없습니다.")

        concat_file = os.path.abspath(os.path.join(
            self.output_dir,
            "concat.txt"
        ))

        with open(concat_file, "w", encoding="utf-8") as file:

            for clip in clips:
                safe_clip = clip.replace(os.sep, "/")
                file.write(f"file '{safe_clip}'\n")

        final_output = os.path.abspath(os.path.join(
            self.output_dir,
            "final_highlight.mp4"
        ))

        result = subprocess.run([
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

        if result.returncode != 0:
            raise RuntimeError(f"최종 하이라이트 영상 생성 실패: {final_output}")

        return final_output
