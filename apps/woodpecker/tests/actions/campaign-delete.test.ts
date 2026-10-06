import { assertEquals, assertRejects } from "@std/assert";
import campaignDelete from "../../actions/campaign-delete.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-delete: DELETE /rest/v2/campaigns/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const out = await campaignDelete.execute({ "campaign_id": "31" } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/campaigns/31");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.deleted, true);
});

Deno.test("campaign-delete: a campaign inside a workflow is refused", async () => {
  const { ctx, calls } = mockCtx([{
    status: 409,
    body: {
      "code": "CAMPAIGN_IN_WORKFLOW",
      "message": "Campaign is part of a workflow",
      "details": null,
    },
  }]);
  await assertRejects(
    async () => await campaignDelete.execute({ "campaign_id": "31" } as never, ctx),
    Error,
    "part of a workflow",
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/rest/v2/campaigns/31");
  assertEquals(jsonBody(calls[0]), null);
});
