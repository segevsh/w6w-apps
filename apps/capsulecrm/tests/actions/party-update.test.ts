import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/party-update.ts";

test("party-update: PUTs /parties/{id} with only the fields set", async () => {
  const { ctx, calls } = mockCtx([{ body: { party: { id: 100, name: "Acme" } } }]);
  const out = await action.execute({ partyId: 100, name: "Acme" }, ctx);
  assertEquals(calls[0].url, "https://api.capsulecrm.com/api/v2/parties/100");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { party: { name: "Acme" } });
  assertEquals(out, { party: { id: 100, name: "Acme" } });
});

test("party-update: an empty update sends an empty party object, not null fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { party: {} } }]);
  await action.execute({ partyId: 100 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { party: {} });
});
