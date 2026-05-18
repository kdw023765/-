def merge_goal_results(results: list):

    merged = []

    for result in results:

        if not result:
            continue

        if isinstance(result, dict) and "goals" in result:
            merged.extend(result["goals"])
        elif isinstance(result, list):
            merged.extend(result)

    merged.sort(
        key=lambda x: x.get("globalTimeSec", 0)
    )

    filtered = []
    last_time = -999

    for goal in merged:

        current_time = goal.get("globalTimeSec", 0)

        if current_time - last_time > 5:
            filtered.append(goal)
            last_time = current_time

    return filtered
