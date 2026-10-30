import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import dealCreate from "../../actions/deal-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("deal-create: POSTs to /opportunities and unwraps the `opportunity` envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { opportunity: { id: "d1", name: "Massive Deal" } } }]);
  const out = await dealCreate.execute({ name: "Massive Deal", account_id: "a1" }, ctx) as {
    deal: { name: string };
  };
  assertEquals(pathOf(calls[0].url), "/api/v1/opportunities");
  assertEquals(JSON.parse(calls[0].body!), { name: "Massive Deal", account_id: "a1" });
  assertEquals(out.deal.name, "Massive Deal");
});
