import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newUser from "../../triggers/new-user.ts";
import newCard from "../../triggers/new-card.ts";
import newDepartment from "../../triggers/new-department.ts";
import newLocation from "../../triggers/new-location.ts";
import newTitle from "../../triggers/new-title.ts";
import newLegalEntity from "../../triggers/new-legal-entity.ts";

const input = { params: {}, subscriptionId: "s" };
const R = "https://api.brex.com/v2";

// Table-driven: the six bounded-collection (pollSnapshot) triggers share one case set.
const specs = [
  {
    name: "new-user",
    trigger: newUser,
    url: `${R}/users?limit=1000`,
    next: `${R}/users?cursor=c1&limit=1000`,
  },
  {
    name: "new-card",
    trigger: newCard,
    url: `${R}/cards?limit=1000`,
    next: `${R}/cards?cursor=c1&limit=1000`,
  },
  {
    name: "new-department",
    trigger: newDepartment,
    url: `${R}/departments?limit=1000`,
    next: `${R}/departments?cursor=c1&limit=1000`,
  },
  {
    name: "new-location",
    trigger: newLocation,
    url: `${R}/locations?limit=1000`,
    next: `${R}/locations?cursor=c1&limit=1000`,
  },
  {
    name: "new-title",
    trigger: newTitle,
    url: `${R}/titles?limit=1000`,
    next: `${R}/titles?cursor=c1&limit=1000`,
  },
  {
    name: "new-legal-entity",
    trigger: newLegalEntity,
    url: `${R}/legal_entities?limit=1000`,
    next: `${R}/legal_entities?cursor=c1&limit=1000`,
  },
];

const page = (items: unknown[], next: string | null = null) => ({ items, next_cursor: next });

for (const { name, trigger, url, next } of specs) {
  const old = [{ id: "one" }];
  const fresh = { id: "two" };

  test(`${name} declares output, sample and a poll, never a subscription hook`, () => {
    assert(trigger.output!.length > 0);
    assert(trigger.sample !== undefined);
    assertEquals(typeof trigger.poll, "function");
    assertEquals(trigger.onSubscribe, undefined);
  });

  test(`${name} seeds without events, then emits only the new record`, async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([{ body: page(old) }]).ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
    const run = () =>
      trigger.poll!(
        { ...input, state: seeded.nextState },
        mockCtx([{ body: page([fresh, ...old]) }]).ctx,
      );
    const first = await run();
    assertEquals(first.events, [fresh]);
    assertEquals(await run(), first); // idempotent retry
  });

  test(`${name} makes the literal request of its list action and follows next_cursor`, async () => {
    const mock = mockCtx([{ body: page(old, "c1") }, { body: page([fresh]) }]);
    const out = await trigger.poll!({ ...input, state: {} }, mock.ctx);
    assertEquals(mock.calls.map((c) => [c.method, c.url]), [["GET", url], ["GET", next]]);
    assertEquals(out.events, []);
    // Both pages were recorded: the second page's record is not "new" on the next check.
    const again = await trigger.poll!(
      { ...input, state: out.nextState },
      mockCtx([{ body: page(old, "c1") }, { body: page([fresh]) }]).ctx,
    );
    assertEquals(again.events, []);
  });

  test(`${name} does not re-emit a record that was already seen`, async () => {
    const seeded = await trigger.poll!({ ...input, state: {} }, mockCtx([{ body: page(old) }]).ctx);
    const again = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: page(old) }]).ctx,
    );
    assertEquals(again.events, []);
  });
}

test("a collection longer than five pages of 1000 is refused, never half-read", async () => {
  const pages = Array.from({ length: 5 }, () => ({ body: page([{ id: "x" }], "more") }));
  await assertRejects(
    () => newUser.poll!({ ...input, state: {} }, mockCtx(pages).ctx),
    Error,
    "refusing to snapshot",
  );
});

test("a record without an id is refused", async () => {
  await assertRejects(
    () =>
      newUser.poll!(
        { ...input, state: {} },
        mockCtx([{ body: page([{ email: "a@example.com" }]) }]).ctx,
      ),
    Error,
    "without an id",
  );
});
