import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-webhooks.ts";

test("list-webhooks: GETs /webhooks and strips secret from every item", async () => {
  const { ctx, calls } = mockCtx([
    { body: { items: [{ id: "w1", secret: "shh", name: "hook" }] } },
  ]);
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://webexapis.com/v1/webhooks");
  assertEquals(result, [{ id: "w1", name: "hook" }]);
});

test("list-webhooks: ownedByOrg maps to ownedBy=org", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute({ ownedByOrg: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("ownedBy"), "org");
});
