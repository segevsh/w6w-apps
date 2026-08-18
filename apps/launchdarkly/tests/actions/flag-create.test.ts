import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/flag-create.ts";

const conn = { display: { projectKey: "default" } };

Deno.test("flag-create: POSTs to the project's flags", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { key: "f" } }], conn);
  await action.execute!({ key: "new-checkout", name: "New checkout" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://app.launchdarkly.com/api/v2/flags/default");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.key, "new-checkout");
  // Meaningful when false, so it always reaches the wire.
  assertEquals(body.temporary, true);
});

Deno.test("flag-create: temporary can be turned off explicitly", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], conn);
  await action.execute!({ key: "k", name: "n", temporary: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).temporary, false);
});

/** A multivariate flag with no variations is a 400 waiting to happen. */
Deno.test("flag-create: a multivariate flag needs at least two variations", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ key: "k", name: "n", kind: "multivariate" }, ctx),
    Error,
    "needs `variations`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("flag-create: a boolean flag needs none", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], conn);
  await action.execute!({ key: "k", name: "n", kind: "boolean" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variations, undefined);
});

Deno.test("flag-create: key and name are both required, before any request", async () => {
  const noKey = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({ name: "n" }, noKey.ctx), Error, "`key`");
  const noName = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({ key: "k" }, noName.ctx), Error, "`name`");
  assertEquals(noKey.calls.length + noName.calls.length, 0);
  assertEquals(action.idempotent, false);
  assert(action.description!.includes("off in every environment"), action.description);
});
