import type { ActionDefinition } from "@w6w/types";
import { HomeAssistantClient } from "../lib/client.ts";

/**
 * `GET /api/error_log` — the log since the last restart.
 *
 * ## Plain text, and it can be long
 *
 * Not JSON: the raw log file, newest last. On an instance with a misbehaving
 * integration it can be tens of megabytes, because a single integration
 * retrying every ten seconds writes a traceback every ten seconds. This action
 * takes the tail rather than returning the lot.
 *
 * ## What it is actually for
 *
 * The state API says an entity is `unavailable`; this says why. A dead
 * integration, an expired vendor token, a device that stopped answering — the
 * explanation is only ever here, and it is the difference between "the sensor
 * is broken" and "the cloud service it depends on changed its API".
 *
 * The log resets on restart, so an instance that has been up for five minutes
 * has five minutes of log regardless of how long the problem has existed.
 */
const action: ActionDefinition = {
  key: "error-log",
  type: "read",
  resource: "log",
  title: "Read the error log",
  description:
    "Plain-text log since the last restart — the only place that explains WHY an entity is " +
    "unavailable. Returns the tail, because a retrying integration can fill megabytes.",
  params: [
    {
      key: "lines",
      label: "Lines",
      type: "number",
      default: 200,
      hint: "From the end, which is the newest.",
    },
    {
      key: "level",
      label: "Only This Level",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Everything" },
        { value: "ERROR", label: "ERROR" },
        { value: "WARNING", label: "WARNING and above" },
      ],
      hint: "A substring match on the level, applied after fetching.",
    },
  ],
  output: [
    { key: "log", type: "string", label: "The selected lines" },
    { key: "lineCount", type: "number", label: "Lines returned" },
    { key: "totalLines", type: "number", label: "Lines in the whole log" },
    { key: "errorCount", type: "number", label: "Lines mentioning ERROR" },
    { key: "warningCount", type: "number", label: "Lines mentioning WARNING" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const text = await new HomeAssistantClient(ctx).request<string>("/error_log", { text: true });
    const all = String(text ?? "").split("\n");

    const errorCount = all.filter((line) => line.includes("ERROR")).length;
    const warningCount = all.filter((line) => line.includes("WARNING")).length;

    const level = String(p.level ?? "").trim();
    let lines = level
      ? all.filter((line) =>
        level === "WARNING"
          ? line.includes("WARNING") || line.includes("ERROR")
          : line.includes(level)
      )
      : all;

    const wanted = Math.max(1, Number(p.lines ?? 200));
    lines = lines.slice(-wanted);

    ctx.log("info", "read the Home Assistant error log", {
      totalLines: all.length,
      errorCount,
      warningCount,
    });

    return {
      log: lines.join("\n"),
      lineCount: lines.length,
      totalLines: all.length,
      errorCount,
      warningCount,
    };
  },
};

export default action;
