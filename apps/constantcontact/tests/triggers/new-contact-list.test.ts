import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-contact-list.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const list = (list_id: string) => ({ list_id, name: `list ${list_id}` });
const ctx = (lists: unknown[], links?: unknown) => mockCtx([{ body: { lists, _links: links } }]);

test("new-contact-list: seeds without flooding and requests the lists", async () => {
  const seed = ctx([list("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.cc.email/v3/contact_lists?limit=500");
});

test("new-contact-list: emits only the list that was added", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([list("a")]).ctx);
  const result = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([list("a"), list("b")]).ctx,
  );
  assertEquals(result.events, [list("b")]);
});

test("new-contact-list: the same state and responses give the same result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([list("a")]).ctx);
  const page = [list("a"), list("b")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});

test("new-contact-list: an account beyond one page is refused, not silently truncated", async () => {
  await assertRejects(
    () =>
      trigger.poll!(
        { ...input, state: {} },
        ctx([list("a")], { next: { href: "/v3/contact_lists?cursor=zzz&limit=500" } }).ctx,
      ) as Promise<unknown>,
    "at most 500",
  );
});

test("new-contact-list: a renamed existing list is not a new list", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([list("a")]).ctx);
  const result = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([{ ...list("a"), name: "renamed" }]).ctx,
  );
  assertEquals(result.events, []);
});
