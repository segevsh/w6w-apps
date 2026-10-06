import { assert, assertEquals, assertRejects } from "@std/assert";
import campaignStatsGet from "../../actions/campaign-stats-get.ts";
import { errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-stats-get: GETs emailmarketing/stats.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({ "campaign": { "stats": { "open": "1 (33.33%)" } } }),
  }]);
  const out = await campaignStatsGet.execute({ "id": "3", "type": "standard" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/stats.json");
  assertEquals(queryOf(calls[0].url), { "id": "3", "type": "standard" });
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "campaign": { "stats": { "open": "1 (33.33%)" } } });
});

Deno.test("campaign-stats-get: is a read with no request body", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({ "campaign": { "stats": { "open": "1 (33.33%)" } } }),
  }]);
  await campaignStatsGet.execute({ "id": "3", "type": "standard" } as never, ctx);
  assertEquals(calls[0].body, null);
  assertEquals(campaignStatsGet.type, "read");
});

Deno.test("campaign-stats-get: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () =>
      await campaignStatsGet.execute({ "id": "3", "type": "standard" } as never, ctx)
    );
    assert((err as Error).message.includes("bad thing"));
  }
});
