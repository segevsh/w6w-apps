import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/search-email-logs.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("search-email-logs: account search sends only the set filters", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { items: [{ message_id: "m" }], page: 1, has_more: true } },
  }]);
  const out = await run(action, {
    logType: "Delivered",
    recipient: " a@x.com ",
    tags: '[{"name":"c","value":"w"}]',
    tagsOperator: "OR",
    from: 1751000000,
    oldestFirst: true,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/logs/search");
  assertEquals(JSON.parse(calls[0].body!), {
    filters: {
      recipient: "a@x.com",
      log_type: "Delivered",
      tags: [{ name: "c", value: "w" }],
      tags_operator: "OR",
      datetime_from: 1751000000,
      sort_dir: 1,
    },
    page: 1,
  });
  assertEquals(out, { items: [{ message_id: "m" }], page: 1, hasMore: true });
});

Deno.test("search-email-logs: a domain id switches to the domain-scoped path", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { items: [], page: 2, has_more: false } } }]);
  await run(action, { domainId: 123, page: 2 }, ctx);
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/domains/123/logs/search");
  assertEquals(JSON.parse(calls[0].body!), { filters: {}, page: 2 });
});

Deno.test("search-email-logs: bad tags JSON shape throws before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(() => run(action, { tags: '{"a":1}' }, ctx), Error, "JSON array");
  assertEquals(calls.length, 0);
});
