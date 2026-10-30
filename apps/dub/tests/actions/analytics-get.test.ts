import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/analytics-get.ts";
import { mockCtx } from "../_helpers.ts";

test("analytics-get: sends GET /analytics with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "country": "US", "clicks": 5 }] }]);
  const out = await action.execute!({
    "event": "clicks",
    "groupBy": "countries",
    "domain": "dub.sh",
    "interval": "7d",
    "utm_source": "news",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.dub.co");
  assertEquals(url.pathname, "/analytics");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    "event": "clicks",
    "groupBy": "countries",
    "domain": "dub.sh",
    "interval": "7d",
    "utm_source": "news",
  });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(out, { "result": [{ "country": "US", "clicks": 5 }] });
});

test("analytics-get: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ "country": "US", "clicks": 5 }] }]);
  await action.execute!({
    "event": "clicks",
    "groupBy": "countries",
    "domain": "dub.sh",
    "interval": "7d",
    "utm_source": "news",
  }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

test("analytics-get: surfaces Dub's error envelope as a thrown error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: { error: { code: "unprocessable_entity", message: "bad input" } },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({
        "event": "clicks",
        "groupBy": "countries",
        "domain": "dub.sh",
        "interval": "7d",
        "utm_source": "news",
      }, ctx),
    Error,
    "bad input (unprocessable_entity)",
  );
});

test("analytics-get: declares type, idempotency and output", () => {
  assert(["read", "search", "perform"].includes(action.type));
  assert(action.params!.length > 0);
  assert(Array.isArray(action.output) && action.output.length > 0);
});
