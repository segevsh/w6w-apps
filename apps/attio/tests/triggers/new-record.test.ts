import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newRecord from "../../triggers/new-record.ts";

// Table-driven: the newest-first query trigger(s) share one case set.
const specs = [
  {
    name: "new-record",
    trigger: newRecord,
    params: { object: "people" },
    url: "https://api.attio.com/v2/objects/people/records/query",
    item: (id: string) => ({ id: { workspace_id: "w", object_id: "o", record_id: id } }),
  },
];

for (const { name, trigger, params, url, item } of specs) {
  const page = (...ids: string[]) => ({ body: { data: ids.map(item) } });

  test(`${name} seeds, emits by its own id, and retries identically`, async () => {
    const seed = await trigger.poll!({ params, state: {} }, mockCtx([page("b", "a")]).ctx);
    assertEquals(seed.events, []);
    assertEquals((seed.nextState as { seeded: boolean }).seeded, true);
    const run = () =>
      trigger.poll!({ params, state: seed.nextState }, mockCtx([page("c", "b", "a")]).ctx);
    const first = await run();
    assertEquals(first.events, [item("c")]);
    assertEquals(await run(), first);
  });

  test(`${name} posts the literal newest-created-first query`, async () => {
    const c = mockCtx([page("a")]);
    await trigger.poll!({ params, state: {} }, c.ctx);
    assertEquals(c.calls.length, 1);
    assertEquals(c.calls[0].method, "POST");
    assertEquals(c.calls[0].url, url);
    assertEquals(JSON.parse(c.calls[0].body!), {
      sorts: [{ direction: "desc", attribute: "created_at" }],
      limit: 50,
    });
  });

  test(`${name} passes the filter through and still pins the sort`, async () => {
    const c = mockCtx([page("a")]);
    const filter = { name: "Ada Lovelace" };
    await trigger.poll!({ params: { ...params, filter }, state: {} }, c.ctx);
    assertEquals(JSON.parse(c.calls[0].body!), {
      filter,
      sorts: [{ direction: "desc", attribute: "created_at" }],
      limit: 50,
    });
  });
}
