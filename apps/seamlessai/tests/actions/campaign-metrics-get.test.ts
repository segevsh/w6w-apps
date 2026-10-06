import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-metrics-get.ts";

const RESPONSE = { "success": true, "data": [{ "emailsSent": 3 }] };

Deno.test("campaign-metrics-get: calls GET /api/client/v2/campaigns/{id}/metrics and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  const result = await action.execute!({ "id": "5" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.seamless.ai");
  assertEquals(url.pathname, "/api/client/v2/campaigns/5/metrics");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, RESPONSE);
});

Deno.test("campaign-metrics-get: sends nothing for fields left unset", async () => {
  const { ctx, calls } = mockCtx([{ body: RESPONSE }]);
  await action.execute!({ "id": "5" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
});

Deno.test("campaign-metrics-get: refuses a missing id before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({} as never, ctx));
  assertEquals(calls.length, 0);
});

Deno.test("campaign-metrics-get: surfaces the vendor's error body", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { msg: "Insufficient credit amount.", code: "insufficientCredits" },
  }]);
  await assertRejects(
    async () => await action.execute!({ "id": "5" }, ctx),
    Error,
    "insufficientCredits",
  );
});
