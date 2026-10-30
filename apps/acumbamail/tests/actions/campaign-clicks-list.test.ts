import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import campaignClicksList from "../../actions/campaign-clicks-list.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

test("campaign-clicks-list: POST /api/1/getCampaignClicks/ with the documented form fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  const out = await campaignClicksList.execute({ "campaign_id": 55 } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/1/getCampaignClicks/");
  assert(calls[0].url.startsWith("https://acumbamail.com/"));
  assertEquals(formOf(calls[0]), { "campaign_id": "55" });
  // the credential is stamped by `sign`, never by the action
  assert(!(calls[0].body ?? "").includes("auth_token"));
  assertEquals(out, { result: { sample: "ok" } });
});

test("campaign-clicks-list: a vendor error surfaces its status and body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Invalid argument" }]);
  const err = await assertRejects(async () =>
    await campaignClicksList.execute({ "campaign_id": 55 } as never, ctx)
  );
  assert(String((err as Error).message).includes("(400)"));
  assert(String((err as Error).message).includes("Invalid argument"));
});

test("campaign-clicks-list: an empty campaign_id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await campaignClicksList.execute({ "campaign_id": "  " } as never, ctx),
    Error,
    "campaign_id is required",
  );
  assertEquals(calls.length, 0);
});
