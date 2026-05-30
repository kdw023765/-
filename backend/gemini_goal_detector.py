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

        골 장면의 기준:
- 공이 골대 안으로 들어가 골망에 닿는 장면을 최우선으로 찾는다.
- 골망 접촉이 선명하지 않아도, 공이 골라인을 완전히 통과하고 득점 상황이 명확하면 골로 인정한다.
- 선수 세리머니, 골키퍼 반응, 스코어 변화, 관중 반응은 보조 근거로 사용한다.

단, 아래는 골이 아니다:
- 골키퍼 선방
- 수비가 막음
- 골대 맞고 나옴
- 골대 밖으로 나감
- 단순 슈팅

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
