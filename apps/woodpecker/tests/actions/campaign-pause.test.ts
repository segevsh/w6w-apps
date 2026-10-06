import { assertEquals, assertRejects } from "@std/assert";
import campaignPause from "../../actions/campaign-pause.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-pause: POST /rest/v2/campaigns/{id}/pause answers 200 with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await campaignPause.execute({ "campaign_id": "55" } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/campaigns/55/pause");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.campaign_id, "55");
  assertEquals(out.requested, "pause");
});

Deno.test("campaign-pause: an unknown campaign is an error", async () => {
  const { ctx, calls } = mockCtx([{
    status: 404,
    body: { "code": "CAMPAIGN_NOT_EXIST", "message": "Campaign not found", "details": null },
  }]);
  await assertRejects(
    async () => await campaignPause.execute({ "campaign_id": "55" } as never, ctx),
    Error,
    "Campaign not found",
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/rest/v2/campaigns/55/pause");
  assertEquals(jsonBody(calls[0]), null);
});
