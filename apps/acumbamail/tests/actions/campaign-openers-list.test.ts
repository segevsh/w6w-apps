import { assert, assertEquals, assertRejects } from "@std/assert";
import campaignOpenersList from "../../actions/campaign-openers-list.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("campaign-openers-list: POST /api/1/getCampaignOpeners/ with the documented form fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  const out = await campaignOpenersList.execute(
    { "campaign_id": 55, "exclude_clickers": true, "block_index": 0 } as never,
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/1/getCampaignOpeners/");
  assert(calls[0].url.startsWith("https://acumbamail.com/"));
  assertEquals(formOf(calls[0]), {
    "campaign_id": "55",
    "exclude_clickers": "1",
    "block_index": "0",
  });
  // the credential is stamped by `sign`, never by the action
  assert(!(calls[0].body ?? "").includes("auth_token"));
  assertEquals(out, { result: { sample: "ok" } });
});

Deno.test("campaign-openers-list: a vendor error surfaces its status and body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Invalid argument" }]);
  const err = await assertRejects(async () =>
    await campaignOpenersList.execute(
      { "campaign_id": 55, "exclude_clickers": true, "block_index": 0 } as never,
      ctx,
    )
  );
  assert(String((err as Error).message).includes("(400)"));
  assert(String((err as Error).message).includes("Invalid argument"));
});

Deno.test("campaign-openers-list: an empty campaign_id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await campaignOpenersList.execute(
        { "campaign_id": "  ", "exclude_clickers": true, "block_index": 0 } as never,
        ctx,
      ),
    Error,
    "campaign_id is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("campaign-openers-list: unset optional fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  await campaignOpenersList.execute({ "campaign_id": 55 } as never, ctx);
  assertEquals(formOf(calls[0]), { "campaign_id": "55" });
});
