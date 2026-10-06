import { assertEquals, assertRejects } from "@std/assert";
import campaignRun from "../../actions/campaign-run.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-run: POST /rest/v2/campaigns/{id}/run answers 200 with no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await campaignRun.execute({ "campaign_id": "55" } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/campaigns/55/run");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.campaign_id, "55");
  assertEquals(out.requested, "run");
});

Deno.test("campaign-run: an unknown campaign is an error", async () => {
  const { ctx, calls } = mockCtx([{
    status: 404,
    body: { "code": "CAMPAIGN_NOT_EXIST", "message": "Campaign not found", "details": null },
  }]);
  await assertRejects(
    async () => await campaignRun.execute({ "campaign_id": "55" } as never, ctx),
    Error,
    "Campaign not found",
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/rest/v2/campaigns/55/run");
  assertEquals(jsonBody(calls[0]), null);
});
