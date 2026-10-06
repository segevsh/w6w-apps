import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/account-get.ts";
import { mockCtx } from "../_helpers.ts";

const account = {
  email: "a@b.test",
  remaining_api_calls: 5,
  remaining_monthly_credits: 5,
  remaining_payg_credits: 1,
  remaining_total_credits: 6,
  resets_at: 1617073667,
  remaining_concurrency: 2,
};

Deno.test("account-get: GETs /account with no extra query and returns the document", async () => {
  const { ctx, calls } = mockCtx([{ body: account }]);
  assertEquals(await action.execute({}, ctx), account);
  assertEquals(calls[0].url, "https://api.webscraping.ai/account");
  assertEquals(calls[0].method, "GET");
});

Deno.test("account-get: 403 is reported as a rejected key; a non-JSON 200 is an error", async () => {
  const bad = mockCtx([{ status: 403, body: { message: "Wrong API key." } }]);
  await assertRejects(async () => await action.execute({}, bad.ctx), Error, "Wrong API key.");
  const html = mockCtx([{ headers: { "content-type": "text/html" }, body: "<html></html>" }]);
  await assertRejects(async () => await action.execute({}, html.ctx), Error, "expected JSON");
});
