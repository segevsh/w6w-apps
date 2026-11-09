import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-database-page.ts";

const params = { dataSourceId: "ds-1" };
const page = (id: string) => ({ object: "page", id, created_time: "2026-11-09T10:00:00.000Z" });
const list = (...ids: string[]) => ({
  body: { object: "list", results: ids.map(page), next_cursor: null, has_more: false },
});

test("new-database-page seeds, emits only the new page, retries identically, queries newest-first", async () => {
  const seed = mockCtx([list("old")]);
  const seeded = await trigger.poll!({ state: {}, params } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(new URL(seed.calls[0].url).pathname, "/v1/data_sources/ds-1/query");
  assertEquals(JSON.parse(seed.calls[0].body ?? "{}"), {
    sorts: [{ timestamp: "created_time", direction: "descending" }],
    page_size: 25,
  });

  const responses = [list("new", "old")];
  const first = await trigger.poll!(
    { state: seeded.nextState, params } as never,
    mockCtx(responses).ctx,
  );
  const retry = await trigger.poll!(
    { state: seeded.nextState, params } as never,
    mockCtx(responses).ctx,
  );
  assertEquals(first.events, [page("new")]);
  assertEquals(retry, first);
});

test("new-database-page is bounded to one page per check", async () => {
  const m = mockCtx([{
    body: { object: "list", results: [page("a")], next_cursor: "c", has_more: true },
  }]);
  await trigger.poll!({ state: {}, params } as never, m.ctx);
  assertEquals(m.calls.length, 1);
});
