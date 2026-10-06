import { assertEquals, assertRejects } from "@std/assert";
import threadGet from "../../actions/thread-get.ts";
import { mockCtx, pathOf, queryOf, slError } from "../_helpers.ts";

Deno.test("thread-get: GET /v1/threads/th1 with the documented parameters", async () => {
  const response = {
    threadId: "th1",
    status: "completed",
    rounds: [{ question: "q", answer: "a" }],
  };
  const { ctx, calls } = mockCtx([{ body: response }]);
  const out = await threadGet.execute({ threadId: "th1" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/threads/th1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined, "credentials belong to sign only");
  assertEquals(out, response);
});

Deno.test("thread-get: a vendor error surfaces its own message and id", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: slError("field-validation", "Validation Failed"),
  }]);
  await assertRejects(
    async () => await threadGet.execute({ threadId: "th1" }, ctx),
    Error,
    "Slite 422: Validation Failed (field-validation)",
  );
});

Deno.test("thread-get: a 202 processing thread is returned as is, so the workflow can branch on status", async () => {
  const body = { threadId: "th1", status: "processing", rounds: [], retryAfterSeconds: 4 };
  const { ctx } = mockCtx([{ status: 202, body }]);
  assertEquals(await threadGet.execute({ threadId: "th1" }, ctx), body);
});
