import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/client-get.ts";

test("client-get: passes the EncodedId through as `id` and bounds the properties page", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { client: { id: "c1" } } } }]);
  await action.execute({ clientId: "Z2lkOi8vSm9iYmVyL0NsaWVudC8x" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.variables, { id: "Z2lkOi8vSm9iYmVyL0NsaWVudC8x" });
  assert(sent.query.includes("clientProperties(first: 10)"), "connection must carry a bound");
});

test("client-get: a null client is a real answer, not an error", async () => {
  const { ctx } = mockCtx([{ body: { data: { client: null } } }]);
  assertEquals(await action.execute({ clientId: "missing" }, ctx), { client: null });
});
