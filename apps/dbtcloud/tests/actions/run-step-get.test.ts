import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/run-step-get.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };
const logs = Array.from({ length: 200 }, (_, i) => `line ${i}`).join("\n");

/** A debug log is measured in megabytes on a large project. */
Deno.test("run-step-get: returns no logs by default", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: { data: { id: 5, name: "dbt run", status: 20, logs, debug_logs: logs } },
    }],
    { display },
  );
  const result = await action.execute!({ stepId: "5" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://ab123.us1.dbt.com/api/v2/accounts/42/steps/5/");
  assertEquals(result.logs, undefined);
  assertEquals(result.debug_logs, undefined);
  assertEquals(result.statusName, "Error");
});

/** The last fifty lines contain the error; the rest is a build transcript. */
Deno.test("run-step-get: tail mode returns the last 50 lines", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: { data: { id: 5, status: 20, logs } } }],
    { display },
  );
  const result = await action.execute!({ stepId: "5", logs: "tail" }, ctx) as { logs: string };
  const lines = result.logs.split("\n");
  assertEquals(lines.length, 50);
  assertEquals(lines[49], "line 199");
});

Deno.test("run-step-get: full mode returns everything dbt printed", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: { data: { id: 5, status: 10, logs } } }],
    { display },
  );
  const result = await action.execute!({ stepId: "5", logs: "full" }, ctx) as { logs: string };
  assertEquals(result.logs, logs);
});

/** The debug log is never returned, whatever the mode. */
Deno.test("run-step-get: the debug log is dropped even in full mode", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: { data: { id: 5, status: 10, logs: "a", debug_logs: "HUGE" } } }],
    { display },
  );
  const result = await action.execute!({ stepId: "5", logs: "full" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.debug_logs, undefined);
  assert(!JSON.stringify(result).includes("HUGE"));
});

Deno.test("run-step-get: needs a step id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "stepId");
  assertEquals(calls.length, 0);
});
