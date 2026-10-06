import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/file-add.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("file-add: POST /files and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "code": 200, "result": { "id": 7, "status": "waiting" } },
  }]);
  const out = await action.execute!({ "url": "https://x/y.png", "filename": "y.png" }, ctx);
  assertEquals(out, { "id": 7, "status": "waiting" });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.printful.com/files");
  assertEquals(JSON.parse(calls[0].body!), { "url": "https://x/y.png", "filename": "y.png" });
});

Deno.test("file-add: a Printful error is surfaced with its reason and message", async () => {
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
    async () => await action.execute!({ "url": "https://x/y.png", "filename": "y.png" }, ctx),
    Error,
    "HTTP 429 — Too Many Requests: slow down (rate limit resets in 30s)",
  );
});
