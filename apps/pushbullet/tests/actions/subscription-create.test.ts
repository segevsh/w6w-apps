import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import subscriptionCreate from "../../actions/subscription-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("subscription-create: POSTs {channel_tag} to /v2/subscriptions", async () => {
  const { ctx, calls } = mockCtx([{ body: { iden: "s1" } }]);
  await subscriptionCreate.execute({ channelTag: "elonmusknews" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/subscriptions");
  assertEquals(JSON.parse(calls[0].body!), { channel_tag: "elonmusknews" });
});

test("subscription-create: is declared non-idempotent — resubscribe behaviour is undocumented", () => {
  assertEquals(subscriptionCreate.idempotent, false);
});
