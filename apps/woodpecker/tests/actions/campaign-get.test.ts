import { assertEquals, assertRejects } from "@std/assert";
import campaignGet from "../../actions/campaign-get.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-get: GET /rest/v2/campaigns/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "id": 12345678,
      "name": "One-step",
      "status": "DRAFT",
      "email_account_ids": [112233],
      "settings": { "daily_enroll": 50 },
    },
  }]);
  const out = await campaignGet.execute({ "campaign_id": "12345678" } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/campaigns/12345678");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.name, "One-step");
  assertEquals(out.email_account_ids, [112233]);
});

Deno.test("campaign-get: rejects an empty id without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await campaignGet.execute({ "campaign_id": "  " } as never, ctx),
    Error,
    "ID was empty",
  );
  assertEquals(calls.length, 0);
});
