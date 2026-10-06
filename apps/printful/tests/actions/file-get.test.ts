import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/file-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("file-get: GET /files/7 and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "code": 200, "result": { "id": 7, "status": "ok" } },
  }]);
  const out = await action.execute!({ "fileId": 7 }, ctx);
  assertEquals(out, { "id": 7, "status": "ok" });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.printful.com/files/7");
  assertEquals(calls[0].body, null);
});

Deno.test("file-get: a Printful error is surfaced with its reason and message", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    headers: { "content-type": "application/json", "x-ratelimit-reset": "30" },
    body: {
      code: 429,
      result: "Too many requests",
      error: { reason: "Too Many Requests", message: "slow down" },
    },
  }]);
  await assertRejects(
    async () => await action.execute!({ "fileId": 7 }, ctx),
    Error,
    "HTTP 429 — Too Many Requests: slow down (rate limit resets in 30s)",
  );
});
