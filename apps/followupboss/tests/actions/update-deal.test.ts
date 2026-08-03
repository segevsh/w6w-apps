import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import updateDeal from "../../actions/update-deal.ts";

Deno.test("update-deal: PUTs /deals/{id} and omits untouched fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 2146 } }]);
  await updateDeal.execute({ id: 2146, stageId: 6 }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.followupboss.com/v1/deals/2146");
  assertEquals(JSON.parse(calls[0].body!), { stageId: 6 });
});

/**
 * The PUT page misspells these two (`agentCommision` / `teamComission`); the
 * POST schema, both response examples and GET /deals all use the double-s,
 * double-m forms. Three sources against one typo — send the correct spelling.
 */

/**
 * The PUT page misspells these two (`agentCommision` / `teamComission`); the
 * POST schema, both response examples and GET /deals all use the double-s,
 * double-m forms. Three sources against one typo — send the correct spelling.
 */
Deno.test("update-deal: sends the correctly-spelled commission keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await updateDeal.execute({ id: 1, agentCommission: 50, teamCommission: 50 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.agentCommission, 50);
  assertEquals(body.teamCommission, 50);
  assert(!("agentCommision" in body), "sent the vendor's typo instead of the correct spelling");
  assert(!("teamComission" in body), "sent the vendor's typo instead of the correct spelling");
});
