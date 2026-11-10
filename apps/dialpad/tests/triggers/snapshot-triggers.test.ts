import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx, page } from "../_helpers.ts";
import newOffice from "../../triggers/new-office.ts";
import newUser from "../../triggers/new-user.ts";
import newContact from "../../triggers/new-contact.ts";
import newRoom from "../../triggers/new-room.ts";
import newCallRouter from "../../triggers/new-call-router.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const row = (id: string) => ({ id, name: `Record ${Number(id) % 2}` });
const cases = [
  { name: "new-office", trigger: newOffice, url: "https://dialpad.com/api/v2/offices" },
  { name: "new-user", trigger: newUser, url: "https://dialpad.com/api/v2/users" },
  { name: "new-contact", trigger: newContact, url: "https://dialpad.com/api/v2/contacts" },
  { name: "new-room", trigger: newRoom, url: "https://dialpad.com/api/v2/rooms" },
  {
    name: "new-call-router",
    trigger: newCallRouter,
    url: "https://dialpad.com/api/v2/callrouters",
  },
];

for (const c of cases) {
  describe(c.name, () => {
    test("seeds without emitting, then emits only the new record, idempotently", async () => {
      const seed = mockCtx([{ body: page([row("1"), row("2")]) }]);
      const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
      const body = page([row("1"), row("2"), row("3")]);
      const first = await c.trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([{ body }]).ctx,
      );
      const retry = await c.trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([{ body }]).ctx,
      );
      assertEquals(first.events, [row("3")]);
      assertEquals(retry, first);
    });

    test("sends the list action's literal request, then follows the cursor", async () => {
      const m = mockCtx([
        { body: page([row("1")], "next-page") },
        { body: page([row("2")]) },
      ]);
      const out = await c.trigger.poll!({ ...input, state: {} }, m.ctx);
      assertEquals(out.events, []);
      assertEquals(m.calls.length, 2);
      assertEquals(m.calls[0].method, "GET");
      assertEquals(m.calls[0].url, c.url);
      assertEquals(m.calls[1].url, `${c.url}?cursor=next-page`);
      // A record only on the second page counts as seen.
      const again = await c.trigger.poll!(
        { ...input, state: out.nextState },
        mockCtx([{ body: page([row("1")], "next-page") }, { body: page([row("2")]) }]).ctx,
      );
      assertEquals(again.events, []);
    });
  });
}

test("a collection that never ends fails the check instead of reporting a partial snapshot", async () => {
  const forever = mockCtx(Array.from({ length: 101 }, (_, i) => ({
    body: page([row(String(i))], `c${i}`),
  })));
  await assertRejects(
    () => newOffice.poll!({ ...input, state: {} }, forever.ctx),
    Error,
    "refusing a partial snapshot",
  );
});
