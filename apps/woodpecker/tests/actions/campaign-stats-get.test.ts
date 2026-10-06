import { assertEquals, assertRejects } from "@std/assert";
import campaignStatsGet from "../../actions/campaign-stats-get.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-stats-get: fetches the single campaign with stats", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: [{
      "id": 1234567,
      "name": "SQL follow-ups",
      "status": "RUNNING",
      "stats": { "prospects": 868, "replied": 74 },
    }],
  }]);
  const out = await campaignStatsGet.execute({ "campaign_id": "1234567" } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.startsWith("https://api.woodpecker.co/"), true);
  assertEquals(pathOf(calls[0].url), "/rest/v1/campaign_list");
  assertEquals(queryOf(calls[0].url), { "id": "1234567" });
  assertEquals(jsonBody(calls[0]), null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals((out.stats as { replied: number }).replied, 74);
});

Deno.test("campaign-stats-get: an empty answer is an error", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "message": "There are no campaigns" } }]);
  await assertRejects(
    async () => await campaignStatsGet.execute({ "campaign_id": "9" } as never, ctx),
    Error,
    "no campaign",
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/rest/v1/campaign_list");
  assertEquals(jsonBody(calls[0]), null);
});
