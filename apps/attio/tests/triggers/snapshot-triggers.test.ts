import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newList from "../../triggers/new-list.ts";
import newWorkspaceMember from "../../triggers/new-workspace-member.ts";

// Table-driven: the two bounded-collection (pollSnapshot) triggers share one case set.
const specs = [
  {
    name: "new-list",
    trigger: newList,
    url: "https://api.attio.com/v2/lists",
    item: (id: string) => ({ id: { workspace_id: "w", list_id: id }, name: id }),
  },
  {
    name: "new-workspace-member",
    trigger: newWorkspaceMember,
    url: "https://api.attio.com/v2/workspace_members",
    item: (id: string) => ({ id: { workspace_id: "w", workspace_member_id: id }, first_name: id }),
  },
];

for (const { name, trigger, url, item } of specs) {
  const input = { params: {}, subscriptionId: "s" };
  const data = (...ids: string[]) => ({ body: { data: ids.map(item) } });

  test(`${name} seeds without events, then emits only the new record, idempotently`, async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([data("one")]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    const run = () =>
      trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([data("two", "one")]).ctx);
    const first = await run();
    assertEquals(first.events, [item("two")]);
    assertEquals(await run(), first);
  });

  test(`${name} makes the literal request of its list action`, async () => {
    const mock = mockCtx([data("one")]);
    await trigger.poll!({ ...input, state: {} }, mock.ctx);
    assertEquals(mock.calls.length, 1);
    assertEquals(mock.calls[0].method, "GET");
    assertEquals(mock.calls[0].url, url);
  });

  test(`${name} does not re-emit a record that was already seen`, async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([data("one")]).ctx);
    const again = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([data("one")]).ctx,
    );
    assertEquals(again.events, []);
  });
}
