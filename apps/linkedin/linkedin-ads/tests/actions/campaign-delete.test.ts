import { assertEquals } from "@std/assert";
import campaignDelete from "../../actions/campaign-delete.ts";
import { mockCtx, noContentResponse, pathOf } from "../_helpers.ts";

Deno.test("campaign-delete: defaults to the soft path — PARTIAL_UPDATE status PENDING_DELETION", async () => {
  const { ctx, calls } = mockCtx([noContentResponse()]);
  const result = await campaignDelete.execute({ accountId: "1", campaignId: "2" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["x-restli-method"], "PARTIAL_UPDATE");
  assertEquals(JSON.parse(calls[0].body!), { patch: { $set: { status: "PENDING_DELETION" } } });
  assertEquals(result, { ok: true });
});

Deno.test("campaign-delete: hardDelete sends HTTP DELETE with no body", async () => {
  const { ctx, calls } = mockCtx([noContentResponse()]);
  await campaignDelete.execute({ accountId: "1", campaignId: "2", hardDelete: true }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(pathOf(calls[0].url), "/rest/adAccounts/1/adCampaigns/2");
});

Deno.test("campaign-delete: is idempotent", () => {
  assertEquals(campaignDelete.idempotent, true);
});
