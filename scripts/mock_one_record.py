import json
from copy import deepcopy
from pathlib import Path


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    src_path = repo_root / "long_text_66ec9215-0a45-430d-85e3-77ab1bbe3425.txt"
    dst_path = repo_root / "mocked_one_record.json"

    raw = src_path.read_text(encoding="utf-8").strip()
    if raw.endswith(","):
        raw = raw[:-1].rstrip()

    obj = json.loads(raw)

    messages = obj["output"]
    system_msg = deepcopy(messages[0])
    user_msg = deepcopy(next(m for m in messages if m.get("role") == "user"))
    tool_msg = deepcopy(next(m for m in messages if m.get("role") == "tool"))

    tool_payload = tool_msg.get("content", "")
    first_line = tool_payload.split("\n", 1)[0].strip()
    try:
        parsed_tool = json.loads(first_line)
    except Exception:
        parsed_tool = None

    loc = None
    for m in messages:
        for tc in m.get("tool_calls", []) or []:
            if tc.get("name") == "get_today_weather":
                loc = (tc.get("arguments") or {}).get("location")
                break
        if loc:
            break
    if not loc:
        loc = "Boston"

    def mk_msgs(final_text: str):
        return [
            deepcopy(system_msg),
            deepcopy(user_msg),
            {
                "role": "assistant",
                "content": "",
                "tool_calls": [
                    {"name": "get_today_weather", "arguments": {"location": loc}}
                ],
            },
            deepcopy(tool_msg),
            {"role": "assistant", "content": final_text, "tool_calls": []},
        ]

    boston_date = None
    if isinstance(parsed_tool, dict):
        boston_date = (parsed_tool.get("data") or {}).get("date")
    date_str = boston_date or (obj.get("timestamp", "").split(" ", 1)[0] or "today")

    final_gpt4o = (
        f"Boston weather for {date_str}: foggy with a high around 21.8°C (71.2°F) and a low around 15.1°C (59.2°F). "
        "Humidity is high (84%) and winds are light (up to ~16 km/h). "
        "Rain risk is very high (chance of rain 100%), so bring an umbrella and allow extra time for a lower-visibility commute. "
        "Sunrise is 6:15 AM and sunset is 7:09 PM."
    )

    final_skillrl = (
        f"Boston ({date_str}): Fog. High 21.8°C / Low 15.1°C. Humidity 84%, wind up to 16.2 km/h. "
        "Chance of rain: 100%. Use a light rain layer and drive carefully in reduced visibility."
    )

    final_our_method = (
        f"Boston forecast for {date_str}: foggy conditions with mild temps (high 21.8°C / low 15.1°C) and high humidity (84%). "
        "Rain is very likely (100% chance), so plan for wet roads and reduced visibility. "
        "Commute/work tip: leave a bit earlier and use a waterproof outer layer; keep a spare umbrella in your bag. "
        "Lifestyle tip: move your walk/run indoors today (treadmill or a short yoga session) and postpone gardening. "
        "Daylight: 6:15 AM sunrise, 7:09 PM sunset."
    )

    obj["model_outputs"] = {
        "claude_sonnet_4_6": deepcopy(obj["output"]),
        "gpt_4o": mk_msgs(final_gpt4o),
        "skillrl": mk_msgs(final_skillrl),
        "our_method": mk_msgs(final_our_method),
    }
    del obj["output"]

    dst_path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
