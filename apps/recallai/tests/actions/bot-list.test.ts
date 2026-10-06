import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/bot-list.ts";

Deno.test("bot-list: maps filters, a metadata key/value pair, and offset paging", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      count: 42,
      next: "https://us-west-2.recall.ai/api/v1/bot/?page=3",
      previous: null,
      results: [{ id: "b1" }],
    },
  }]);
  const out = await action.execute!({
    joinAtAfter: "2026-10-01",
    joinAtBefore: "2026-10-31",
    meetingUrl: "https://zoom.us/j/1",
    platform: "zoom",
    status: "done",
    metadataKey: "deal",
    metadataValue: "123",
    page: 2,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/bot/");
  assertEquals(Object.fromEntries(url.searchParams), {
    join_at_after: "2026-10-01",
    join_at_before: "2026-10-31",
    meeting_url: "https://zoom.us/j/1",
    platform: "zoom",
    status: "done",
    page: "2",
    metadata__deal: "123",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { bots: [{ id: "b1" }], count: 42, nextPage: 3 });
});

Deno.test("bot-list: last page has no nextPage; no filters sends no query", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 0, next: null, previous: null, results: [] } }]);
  assertEquals(await action.execute!({}, ctx), { bots: [], count: 0 });
  assertEquals(calls[0].url, "https://us-west-2.recall.ai/api/v1/bot/");
});

Deno.test("bot-list: a rate limit carries the Retry-After", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    headers: { "content-type": "application/json", "retry-after": "12" },
    body: { detail: "Request was throttled." },
  }]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "retry after 12s");
});
