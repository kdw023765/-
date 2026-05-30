import json
import os
import re
import time

import google.generativeai as genai


class GeminiGoalDetector:

    def __init__(self):

        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise RuntimeError("GEMINI_API_KEY 환경변수가 없습니다.")

        genai.configure(api_key=api_key)

        self.model = genai.GenerativeModel(
            "gemini-2.5-flash"
        )

    async def detect_goals(self, video_path: str):

        uploaded_file = genai.upload_file(video_path)

        uploaded_file = self._wait_until_file_active(uploaded_file)

        prompt = """
        축구 경기 영상이다.

        골 장면의 기준은 공이 골대에 들어가고 골망에 닿음이다.
        이 기준을 만족하는 실제 득점 장면만 찾아라.

        골키퍼가 막은 장면, 수비가 막은 장면, 골대 밖으로 나간 장면,
        골대에 맞고 나온 장면, 단순 슈팅 장면은 골 장면이 아니다.

        골 장면 발생 시간만 초(second) 단위 JSON으로 반환해라.

        반드시 아래 JSON 형식만 반환해라.
        설명 문장, 마크다운, 코드블록은 쓰지 마라.

        {
            \"goals\": [
                {
                    \"timeSec\": 120
                }
            ]
        }

        골 장면이 없으면 다음처럼 반환해라.

        {
            \"goals\": []
        }
        """

        response = self.model.generate_content([
            uploaded_file,
            prompt
        ])

        print("===== GEMINI RESPONSE =====")
        print(response.text)

        text = response.text.strip()
        text = text.replace("```json", "")
        text = text.replace("```", "")
        text = text.strip()

        try:
            parsed = json.loads(text)
            return parsed.get("goals", [])

        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", text, re.DOTALL)

            if not match:
                raise RuntimeError(
                    f"Gemini 응답에서 JSON을 찾지 못했습니다: {text}"
                )

            parsed = json.loads(match.group(0))
            return parsed.get("goals", [])

        except Exception as e:
            raise RuntimeError(f"Gemini goal detection failed: {e}")

    def _wait_until_file_active(self, uploaded_file, timeout_sec: int = 120):

        deadline = time.time() + timeout_sec

        while uploaded_file.state.name == "PROCESSING":

            if time.time() > deadline:
                raise RuntimeError(
                    f"Gemini 파일 처리 시간 초과: {uploaded_file.name}"
                )

            print(
                f"Gemini 파일 처리 중: {uploaded_file.name}, "
                f"state={uploaded_file.state.name}"
            )

            time.sleep(2)
            uploaded_file = genai.get_file(uploaded_file.name)

        if uploaded_file.state.name != "ACTIVE":
            raise RuntimeError(
                f"Gemini 파일이 ACTIVE 상태가 아닙니다: "
                f"{uploaded_file.name}, state={uploaded_file.state.name}"
            )

        print(
            f"Gemini 파일 사용 가능: {uploaded_file.name}, "
            f"state={uploaded_file.state.name}"
        )

        return uploaded_file
