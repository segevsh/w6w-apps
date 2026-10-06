import { assertEquals, assertRejects } from "@std/assert";
import getCredits from "../../actions/get-credits.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-credits: maps the counters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { credits: 100, bulk_credits: 100, renewing_credits: 5, plan: 4 },
  }]);
  const out = await run(getCredits, {}, ctx);
  assertEquals(calls[0].url, "https://api.millionverifier.com/api/v3/credits");
  assertEquals(out, { credits: 100, bulkCredits: 100, renewingCredits: 5, plan: 4 });
});

Deno.test("get-credits: a 200 error body throws", async () => {
  const { ctx } = mockCtx([{ body: { result: "error", error: "apikey_not_found" } }]);
  await assertRejects(() => run(getCredits, {}, ctx), Error, "apikey_not_found");
});
