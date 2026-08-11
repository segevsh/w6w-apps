import { assert, assertEquals } from "@std/assert";
import webhookList from "../../actions/webhook-list.ts";
import { mockCtx, pathOf, queryOf, v3Page } from "../_helpers.ts";

Deno.test("webhook-list: GETs /v3/hooks", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([{ id: 1, scope: "store/order/created" }]) }]);
  const out = await webhookList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/stores/abc123/v3/hooks");
  assertEquals(out.data.length, 1);
});

Deno.test("webhook-list: filters map through, with the true/false boolean spelling", async () => {
  const { ctx, calls } = mockCtx([{ body: v3Page([]) }]);
  await webhookList.execute({ scope: "store/order/created", isActive: true }, ctx);
  assertEquals(queryOf(calls[0].url), { scope: "store/order/created", is_active: "true" });
});

Deno.test("webhook-list: says out loud that this is NOT a store-wide list", () => {
  // Webhooks are only visible to the API account that created them, so an empty
  // result does not mean the store has none.
  assert(webhookList.description?.includes("THIS API account"), webhookList.description);
});
