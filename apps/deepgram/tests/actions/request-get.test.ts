import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/request-get.ts";

const display = { projectId: "proj_1" };

Deno.test("request-get: fetches one request by id", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { request_id: "req_1", code: 200, duration: 12 } }],
    { display },
  );
  const result = await action.execute!({ requestId: "req_1" }, ctx) as { code: number };
  assertEquals(calls[0].url, "https://api.deepgram.com/v1/projects/proj_1/requests/req_1");
  assertEquals(result.code, 200);
});

Deno.test("request-get: needs a request id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "requestId");
  assertEquals(calls.length, 0);
});

/** The three failures that look identical from outside. */
Deno.test("request-get: says which distinctions it can make", () => {
  assert(/callback never/.test(action.description!), action.description);
});
