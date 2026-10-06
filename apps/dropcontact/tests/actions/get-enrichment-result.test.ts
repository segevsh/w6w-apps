import { assertEquals, assertRejects } from "@std/assert";
import getResult from "../../actions/get-enrichment-result.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-enrichment-result: not ready is a result, not an error", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      error: false,
      success: false,
      reason: "Request not ready yet, try again in 30 seconds",
    },
  }]);
  const out = await run(getResult, { requestId: "req 1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.dropcontact.com/v1/enrich/all/req%201");
  assertEquals(out.ready, false);
  assertEquals(out.count, 0);
  assertEquals(out.reason, "Request not ready yet, try again in 30 seconds");
});

Deno.test("get-enrichment-result: ready returns the data and credits", async () => {
  const { ctx } = mockCtx([{
    body: {
      error: false,
      success: true,
      credits_left: 7,
      data: [{
        first_name: "Peter",
        email: [{ email: "p@c.com", qualification: "nominative@pro" }],
      }],
    },
  }]);
  const out = await run(getResult, { requestId: "r" }, ctx);
  assertEquals(out.ready, true);
  assertEquals(out.count, 1);
  assertEquals(out.creditsLeft, 7);
  assertEquals(out.reason, undefined);
});

Deno.test("get-enrichment-result: forceResults is sent as a query flag; missing id throws", async () => {
  const { ctx, calls } = mockCtx([{ body: { error: false, success: true, data: [] } }]);
  await run(getResult, { requestId: "r", forceResults: true }, ctx);
  assertEquals(calls[0].url, "https://api.dropcontact.com/v1/enrich/all/r?forceResults=true");
  await assertRejects(() => run(getResult, { requestId: " " }, mockCtx().ctx), Error, "requestId");
});

Deno.test("get-enrichment-result: an unknown token throws", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: true, reason: "Unknown account" } }]);
  await assertRejects(() => run(getResult, { requestId: "r" }, ctx), Error, "Unknown account");
});
