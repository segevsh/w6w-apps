import { assertEquals, assertRejects } from "@std/assert";
import prospectUpdateInCampaign from "../../actions/prospect-update-in-campaign.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("prospect-update-in-campaign: POSTs the documented body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "prospects": [{ "email": "erlich@bachman.com", "id": 1091123457 }],
      "status": { "status": "OK", "code": "OK", "msg": "OK" },
    },
  }]);
  const out = await prospectUpdateInCampaign.execute(
    {
      "campaign_id": "1234567",
      "send_after": "2025-04-01T00:01:01+0000",
      "force": false,
      "prospects": [{ "email": "erlich@bachman.com", "first_name": "Erlich" }],
    } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v1/add_prospects_campaign");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "campaign": { "campaign_id": 1234567, "send_after": "2025-04-01T00:01:01+0000" },
    "update": true,
    "force": false,
    "prospects": [{ "email": "erlich@bachman.com", "first_name": "Erlich" }],
  });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals((out.prospects as Array<{ id: number }>)[0].id, 1091123457);
});

Deno.test("prospect-update-in-campaign: a body-level ERROR status is a failure", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "prospects": [{
        "email": "bad",
        "status": "ERROR",
        "code": "E_EMAIL",
        "msg": "invalid email",
      }],
      "status": {
        "status": "ERROR",
        "code": "E_INV_STATUS",
        "msg": "None of the requested prospects were added",
      },
    },
  }]);
  await assertRejects(
    async () =>
      await prospectUpdateInCampaign.execute(
        {
          "campaign_id": "1234567",
          "send_after": "2025-04-01T00:01:01+0000",
          "force": false,
          "prospects": [{ "email": "bad" }],
        } as never,
        ctx,
      ),
    Error,
    "E_INV_STATUS",
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/rest/v1/add_prospects_campaign");
  assertEquals(jsonBody(calls[0]), {
    "campaign": { "campaign_id": 1234567, "send_after": "2025-04-01T00:01:01+0000" },
    "update": true,
    "force": false,
    "prospects": [{ "email": "bad" }],
  });
});

Deno.test("prospect-update-in-campaign: an empty prospects array is refused without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await prospectUpdateInCampaign.execute(
        {
          "campaign_id": "1234567",
          "send_after": "2025-04-01T00:01:01+0000",
          "force": false,
          "prospects": [],
        } as never,
        ctx,
      ),
    Error,
    "non-empty JSON array",
  );
  assertEquals(calls.length, 0);
});
