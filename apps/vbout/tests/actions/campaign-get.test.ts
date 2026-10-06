import { assert, assertEquals, assertRejects } from "@std/assert";
import campaignGet from "../../actions/campaign-get.ts";
import { errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-get: GETs emailmarketing/getcampaign.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({ "item": { "id": "889", "subject": "Hi" } }),
  }]);
  const out = await campaignGet.execute({ "id": "3", "type": "standard" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/getcampaign.json");
  assertEquals(queryOf(calls[0].url), { "id": "3", "type": "standard" });
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "item": { "id": "889", "subject": "Hi" } });
});

Deno.test("campaign-get: is a read with no request body", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({ "item": { "id": "889", "subject": "Hi" } }),
  }]);
  await campaignGet.execute({ "id": "3", "type": "standard" } as never, ctx);
  assertEquals(calls[0].body, null);
  assertEquals(campaignGet.type, "read");
});

Deno.test("campaign-get: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () =>
      await campaignGet.execute({ "id": "3", "type": "standard" } as never, ctx)
    );
    assert((err as Error).message.includes("bad thing"));
  }
});
