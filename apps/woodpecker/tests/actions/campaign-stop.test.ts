import { assertEquals, assertRejects } from "@std/assert";
import campaignStop from "../../actions/campaign-stop.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-stop: POST /rest/v2/campaigns/{id}/stop answers 200 with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await campaignStop.execute({ "campaign_id": "55" } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/campaigns/55/stop");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.campaign_id, "55");
  assertEquals(out.requested, "stop");
});

Deno.test("campaign-stop: an unknown campaign is an error", async () => {
  const { ctx, calls } = mockCtx([{
    status: 404,
    body: { "code": "CAMPAIGN_NOT_EXIST", "message": "Campaign not found", "details": null },
  }]);
  await assertRejects(
    async () => await campaignStop.execute({ "campaign_id": "55" } as never, ctx),
    Error,
    "Campaign not found",
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/rest/v2/campaigns/55/stop");
  assertEquals(jsonBody(calls[0]), null);
});
