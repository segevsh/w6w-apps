import { assertEquals, assertRejects } from "@std/assert";
import campaignUpdate from "../../actions/campaign-update.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-update: PATCHes name and nests settings", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "id": 77, "name": "Renamed", "settings": { "daily_enroll": 30 } },
  }]);
  const out = await campaignUpdate.execute(
    {
      "campaign_id": "77",
      "name": "Renamed",
      "daily_enroll": 30,
      "gdpr_unsubscribe": false,
      "open_disabled_list": '["google.com"]',
    } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/campaigns/77");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "name": "Renamed",
    "settings": {
      "daily_enroll": 30,
      "gdpr_unsubscribe": false,
      "open_disabled_list": ["google.com"],
    },
  });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(out.name, "Renamed");
});

Deno.test("campaign-update: sends no settings object when none is set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 77 } }]);
  await campaignUpdate.execute({ "campaign_id": "77", "email_account_ids": [1, 2] } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v2/campaigns/77");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), { "email_account_ids": [1, 2] });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
});

Deno.test("campaign-update: a validation failure surfaces the vendor message", async () => {
  const { ctx, calls } = mockCtx([{
    status: 400,
    body: {
      "code": "INPUT_DATA_VALIDATION_FAILURE",
      "message": "Input data validation failure",
      "details": null,
    },
  }]);
  await assertRejects(
    async () => await campaignUpdate.execute({ "campaign_id": "77", "name": "x" } as never, ctx),
    Error,
    "Input data validation failure",
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/rest/v2/campaigns/77");
  assertEquals(jsonBody(calls[0]), { "name": "x" });
});
