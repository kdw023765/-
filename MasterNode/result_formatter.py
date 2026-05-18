class ResultFormatter:

    def format(self, goals: list, options: dict):

        response = {
            "goals": goals
        }

        if options.get("timeline"):
            response["timeline"] = self.build_timeline(goals)

        if options.get("handle"):
            response["handles"] = self.build_handles(goals)

        if options.get("labels"):
            response["labels"] = self.build_labels(goals)

        return response

    def build_timeline(self, goals: list):

        return [
            {
                "time": goal.get("globalTimeSec")
            }
            for goal in goals
        ]

    def build_handles(self, goals: list):

        return [
            {
                "position": goal.get("globalTimeSec")
            }
            for goal in goals
        ]

    def build_labels(self, goals: list):

        return [
            {
                "text": goal.get("minuteText")
            }
            for goal in goals
        ]
