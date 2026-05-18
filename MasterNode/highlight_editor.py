class HighlightEditor:

    def build_clips(self, goals: list):

        clips = []

        for goal in goals:

            current_time = goal.get("globalTimeSec", 0)

            clips.append({
                "start": max(0, current_time - 10),
                "end": current_time + 10
            })

        return clips
