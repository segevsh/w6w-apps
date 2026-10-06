import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/usage-get.ts";

Deno.test("usage-get: GETs the range as start and end", async () => {
  const { ctx, calls } = mockCtx([{ body: { bot_total: 12.5 } }]);
  const out = await action.execute!(
    { start: "2026-10-01T00:00:00Z", end: "2026-10-06T00:00:00Z" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/billing/usage/");
  assertEquals(Object.fromEntries(url.searchParams), {
    start: "2026-10-01T00:00:00Z",
    end: "2026-10-06T00:00:00Z",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { bot_total: 12.5 });
});

Deno.test("usage-get: no range sends no query; a 402 is reported", async () => {
  const { ctx, calls } = mockCtx([{ body: { bot_total: 0 } }, {
    status: 402,
    body: { detail: "Insufficient credit" },
  }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://us-west-2.recall.ai/api/v1/billing/usage/");
  await assertRejects(async () => await action.execute!({}, ctx), Error, "HTTP 402");
});
