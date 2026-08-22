import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, text } from "./_shared.ts";
import action from "../../actions/error-log.ts";

const log = text([
  "2026-08-18 09:00:00 INFO (MainThread) [homeassistant.setup] Setup of light",
  "2026-08-18 09:00:01 WARNING (MainThread) [custom.thing] deprecated option",
  "2026-08-18 09:00:02 ERROR (MainThread) [custom.thing] Failed to connect",
  "2026-08-18 09:00:03 INFO (MainThread) [homeassistant.core] Starting",
].join("\n"));

Deno.test("error-log: reads the plain-text log and counts the severities", async () => {
  const { ctx, calls } = mockCtx([log], { display });
  const result = await action.execute!({}, ctx) as {
    totalLines: number;
    errorCount: number;
    warningCount: number;
  };
  assertEquals(calls[0].url, "https://abc.ui.nabu.casa/api/error_log");
  assertEquals(calls[0].headers["accept"], "text/plain");
  assertEquals(result.totalLines, 4);
  assertEquals(result.errorCount, 1);
  assertEquals(result.warningCount, 1);
});

/** A retrying integration can fill megabytes, so the tail is the default. */
Deno.test("error-log: takes the tail, which is the newest", async () => {
  const { ctx } = mockCtx([log], { display });
  const result = await action.execute!({ lines: 2 }, ctx) as { log: string; lineCount: number };
  assertEquals(result.lineCount, 2);
  assert(result.log.includes("Starting"), result.log);
  assert(!result.log.includes("Setup of light"), result.log);
});

Deno.test("error-log: filtering to ERROR keeps only those lines", async () => {
  const { ctx } = mockCtx([log], { display });
  const result = await action.execute!({ level: "ERROR" }, ctx) as {
    lineCount: number;
    log: string;
  };
  assertEquals(result.lineCount, 1);
  assert(result.log.includes("Failed to connect"), result.log);
});

/** WARNING means "and above", because an error matters when warnings do. */
Deno.test("error-log: filtering to WARNING includes errors too", async () => {
  const { ctx } = mockCtx([log], { display });
  const result = await action.execute!({ level: "WARNING" }, ctx) as { lineCount: number };
  assertEquals(result.lineCount, 2);
});

Deno.test("error-log: the counts describe the whole log, not the filtered tail", async () => {
  const { ctx } = mockCtx([log], { display });
  const result = await action.execute!({ lines: 1 }, ctx) as {
    lineCount: number;
    totalLines: number;
    errorCount: number;
  };
  assertEquals(result.lineCount, 1);
  assertEquals(result.totalLines, 4);
  assertEquals(result.errorCount, 1);
});

Deno.test("error-log: logs counts, never the log content", async () => {
  const { ctx, logs } = mockCtx([log], { display });
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("Failed to connect"), JSON.stringify(logs));
  assertEquals(logs[0].data, { totalLines: 4, errorCount: 1, warningCount: 1 });
});

/** The state API says an entity is unavailable; this says why. */
Deno.test("error-log: says what it is for", () => {
  assert(/WHY an entity is\s+unavailable/.test(action.description!), action.description);
});
