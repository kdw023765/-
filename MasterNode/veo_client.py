import httpx


class VeoClient:

    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url

    async def create_highlight(self, prompt: str):

        headers = {
            "Authorization": f"Bearer {self.api_key}"
        }

        payload = {
            "prompt": prompt
        }

        async with httpx.AsyncClient(timeout=300) as client:

            response = await client.post(
                self.base_url,
                headers=headers,
                json=payload
            )

            response.raise_for_status()

            return response.json()
