def merge_goal_results(results: list):

    merged = []

    for result in results:

        if not result:
            continue

        goals = []

        if isinstance(result, dict):
            goals = result.get("goals", [])

        elif isinstance(result, list):
            goals = result

        for goal in goals:

            if not isinstance(goal, dict):
                continue

            if "globalTimeSec" not in goal:
                continue

            merged.append(goal)

    merged.sort(
        key=lambda x: x.get("globalTimeSec", 0)
    )

    filtered = []

    for goal in merged:

        duplicated = False

        current_time = goal.get("globalTimeSec", 0)

        for saved in filtered:

            diff = abs(
                saved.get("globalTimeSec", 0) -
                current_time
            )

            if diff <= 10:
                duplicated = True
                break

        if not duplicated:
            filtered.append(goal)

    return filtered
