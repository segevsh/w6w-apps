import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/identify.ts";

Deno.test("identify: posts userId + traits to /identify", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await action.execute!(
    { userId: "u1", traits: { email: "a@b.com" } },
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://api.segment.io/v1/identify");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { userId: "u1", traits: { email: "a@b.com" } });
  assertEquals(result, { success: true });
});

Deno.test("identify: anonymousId alone satisfies the identity requirement", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ anonymousId: "anon-1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { anonymousId: "anon-1" });
});

Deno.test("identify: rejects when neither userId nor anonymousId is set", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "either `userId` or `anonymousId` is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("identify: passes context, integrations and timestamp through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    {
      userId: "u1",
      context: { ip: "1.2.3.4" },
      integrations: { All: false },
      timestamp: "2026-01-01T00:00:00.000Z",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.context, { ip: "1.2.3.4" });
  assertEquals(body.integrations, { All: false });
  assertEquals(body.timestamp, "2026-01-01T00:00:00.000Z");
});

Deno.test("identify: stamps messageId from the invocation id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], {
    invocation: { invocationId: "inv-abc" },
  });
  await action.execute!({ userId: "u1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).messageId, "inv-abc");
});

Deno.test("identify: a non-2xx response propagates as an Error", async () => {
  const { ctx } = mockCtx([{ status: 401, body: '{"error":"bad write key"}' }]);
  const err = await assertRejects(
    async () => await action.execute!({ userId: "u1" }, ctx),
    Error,
    "Segment 401",
  );
  assert(err.message.includes("bad write key"));
});
