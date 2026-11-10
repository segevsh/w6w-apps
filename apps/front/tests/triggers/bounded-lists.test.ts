import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newChannel from "../../triggers/new-channel.ts";
import newInbox from "../../triggers/new-inbox.ts";
import newTag from "../../triggers/new-tag.ts";
import newTeammate from "../../triggers/new-teammate.ts";

// Company-level lists read whole (brief 9.1 c): one request each, only added rows fire.
const input = { params: {}, subscriptionId: "sub-1" };
const cases = [
  { name: "new-inbox", trigger: newInbox, url: "https://api2.frontapp.com/inboxes?limit=100" },
  { name: "new-channel", trigger: newChannel, url: "https://api2.frontapp.com/channels?limit=100" },
  { name: "new-tag", trigger: newTag, url: "https://api2.frontapp.com/company/tags?limit=100" },
  {
    name: "new-teammate",
    trigger: newTeammate,
    url: "https://api2.frontapp.com/teammates?limit=100",
  },
];
const body = (ids: string[]) => ({
  body: { _results: ids.map((id) => ({ id, name: `name ${id}` })), _pagination: {} },
});

for (const { name, trigger, url } of cases) {
  test(`${name}: seed emits nothing, a new row fires once, a rename does not`, async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([body(["a", "b"])]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    const run = () =>
      trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([body(["a", "b", "c"])]).ctx);
    const first = await run();
    assertEquals(first.events, [{ id: "c", name: "name c" }]);
    assertEquals(await run(), first);
    const renamed = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: { _results: [{ id: "a", name: "new" }, { id: "b", name: "name b" }] } }])
        .ctx,
    );
    assertEquals(renamed.events, []);
  });

  test(`${name}: reads the whole list with one literal GET`, async () => {
    const c = mockCtx([body(["a"])]);
    await trigger.poll!({ ...input, state: {} }, c.ctx);
    assertEquals(c.calls.length, 1);
    assertEquals(c.calls[0].method, "GET");
    assertEquals(c.calls[0].url, url);
  });
}
