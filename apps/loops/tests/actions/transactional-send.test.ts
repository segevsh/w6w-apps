import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/transactional-send.ts";

Deno.test("transactional-send: POSTs the template id, address and variables", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { success: true } }]);
  await action.execute!({
    transactionalId: "t1",
    email: "ada@example.com",
    dataVariables: '{"firstName":"Ada"}',
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://app.loops.so/api/v1/transactional");
  assertEquals(JSON.parse(calls[0].body!), {
    transactionalId: "t1",
    email: "ada@example.com",
    dataVariables: { firstName: "Ada" },
  });
});

/** Off by default: a transactional send should not silently grow the audience. */
Deno.test("transactional-send: addToAudience is opt-in", async () => {
  const off = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ transactionalId: "t1", email: "a@x.com" }, off.ctx);
  assertEquals(JSON.parse(off.calls[0].body!).addToAudience, undefined);

  const on = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ transactionalId: "t1", email: "a@x.com", addToAudience: true }, on.ctx);
  assertEquals(JSON.parse(on.calls[0].body!).addToAudience, true);
});

/** The key is what makes a retry safe; without it two calls send two emails. */
Deno.test("transactional-send: the idempotency key is opt-in and derived from the step", async () => {
  const off = mockCtx([{ status: 200, body: {} }]);
  (off.ctx as { invocation?: unknown }).invocation = { invocationId: "inv1" };
  await action.execute!({ transactionalId: "t1", email: "a@x.com" }, off.ctx);
  assertEquals(off.calls[0].headers["idempotency-key"], undefined);

  const on = mockCtx([{ status: 200, body: {} }]);
  (on.ctx as { invocation?: unknown }).invocation = { invocationId: "inv1" };
  await action.execute!({
    transactionalId: "t1",
    email: "a@x.com",
    useInvocationIdempotencyKey: true,
  }, on.ctx);
  assertEquals(on.calls[0].headers["idempotency-key"], "w6w-inv1");
});

Deno.test("transactional-send: is honestly non-idempotent without the key", () => {
  assertEquals(action.idempotent, false);
});

Deno.test("transactional-send: the id and address are both required, before any request", async () => {
  const noId = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ email: "a@x.com" }, noId.ctx),
    Error,
    "`transactionalId`",
  );
  const noEmail = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ transactionalId: "t1" }, noEmail.ctx),
    Error,
    "`email`",
  );
  assertEquals(noId.calls.length + noEmail.calls.length, 0);
});

/** An unpublished template 404s on send, which reads like a wrong id. */
Deno.test("transactional-send: the hint warns that the template must be published", () => {
  const param = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "transactionalId")!;
  assert(param.hint!.includes("PUBLISHED"), param.hint);
});
