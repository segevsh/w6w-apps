import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/request-list.ts";

const display = { projectId: "proj_1" };
const requests = (list: unknown[]) => ({ status: 200, body: { requests: list } });

/** Deepgram's own default limit is 10, which looks like an empty week. */
Deno.test("request-list: asks for 100 rather than Deepgram's default of 10", async () => {
  const { ctx, calls } = mockCtx([requests([])], { display });
  await action.execute!({}, ctx);
  assertEquals(
    calls[0].url.split("?")[0],
    "https://api.deepgram.com/v1/projects/proj_1/requests",
  );
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "100");
});

Deno.test("request-list: the limit is capped at Deepgram's own maximum", async () => {
  const { ctx, calls } = mockCtx([requests([])], { display });
  await action.execute!({ limit: 5000 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "1000");
});

/** How a workflow finds out that a tenth of last week's jobs never happened. */
Deno.test("request-list: counts the failures separately", async () => {
  const { ctx } = mockCtx([requests([{ code: 200 }, { code: 500 }, { code: 400 }])], { display });
  const result = await action.execute!({ status: "failed" }, ctx) as {
    count: number;
    failedCount: number;
  };
  assertEquals(result.count, 3);
  assertEquals(result.failedCount, 2);
});

Deno.test("request-list: a single request id can be looked up", async () => {
  const { ctx, calls } = mockCtx([requests([])], { display });
  await action.execute!({ requestId: "req_9" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("request_id"), "req_9");
});

Deno.test("request-list: logs counts only", async () => {
  const { ctx, logs } = mockCtx([requests([{ code: 200 }])], { display });
  await action.execute!({}, ctx);
  assertEquals(logs[0].data, { count: 1, failedCount: 0 });
});

Deno.test("request-list: says what the failure filter is for", () => {
  assert(/never happened/.test(action.description!), action.description);
});
