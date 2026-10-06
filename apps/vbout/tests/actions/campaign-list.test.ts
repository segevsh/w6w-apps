import { assert, assertEquals, assertRejects } from "@std/assert";
import campaignList from "../../actions/campaign-list.ts";
import { errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-list: GETs emailmarketing/campaigns.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({ "campaigns": { "count": 1, "items": {} } }),
  }]);
  const out = await campaignList.execute({ "filter": "all", "limit": 5, "page": 5 } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/campaigns.json");
  assertEquals(queryOf(calls[0].url), { "filter": "all", "limit": "5", "page": "5" });
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "campaigns": { "count": 1, "items": {} } });
});

Deno.test("campaign-list: is a read with no request body", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({ "campaigns": { "count": 1, "items": {} } }),
  }]);
  await campaignList.execute({ "filter": "all", "limit": 5, "page": 5 } as never, ctx);
  assertEquals(calls[0].body, null);
  assertEquals(campaignList.type, "read");
});

Deno.test("campaign-list: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () =>
      await campaignList.execute({ "filter": "all", "limit": 5, "page": 5 } as never, ctx)
    );
    assert((err as Error).message.includes("bad thing"));
  }
});
