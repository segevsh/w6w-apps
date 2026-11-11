import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import newTemplate from "../../triggers/new-template.ts";
import newContact from "../../triggers/new-contact-in-list.ts";

const input = { subscriptionId: "sub_1" };
const tpl = (name: string) => ({ Name: name, Subject: `S ${name}`, TemplateScope: "Personal" });
const contact = (email: string) => ({ Email: email, Status: "Active" });
const seededOf = (s: unknown) => (s as { seeded?: boolean }).seeded;

test("new-template: seeds, emits only added templates, retries idempotently", async () => {
  const params = {};
  const seed = mockCtx([{ body: [tpl("a")] }]);
  const seeded = await newTemplate.poll!({ ...input, params, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seededOf(seeded.nextState), true);

  const first = mockCtx([{ body: [tpl("a"), tpl("b")] }]);
  const retry = mockCtx([{ body: [tpl("a"), tpl("b")] }]);
  const result = await newTemplate.poll!({ ...input, params, state: seeded.nextState }, first.ctx);
  const again = await newTemplate.poll!({ ...input, params, state: seeded.nextState }, retry.ctx);
  assertEquals(result.events, [tpl("b")]);
  assertEquals(again.events, result.events);
});

test("new-template: requests GET /v4/templates?scopeType=Personal&limit=500 (literal)", async () => {
  const m = mockCtx([{ body: [] }]);
  await newTemplate.poll!({ ...input, params: {}, state: {} }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(pathOf(m.calls[0].url), "/v4/templates");
  assertEquals(queryOf(m.calls[0].url), { scopeType: "Personal", limit: "500" });
  const g = mockCtx([{ body: [] }]);
  await newTemplate.poll!({ ...input, params: { scopeType: "Global" }, state: {} }, g.ctx);
  assertEquals(queryOf(g.calls[0].url), { scopeType: "Global", limit: "500" });
});

test("new-template: edits and removals do not emit; a full answer fails naming the cap", async () => {
  const seeded = await newTemplate.poll!(
    { ...input, params: {}, state: {} },
    mockCtx([{ body: [tpl("a"), tpl("b")] }]).ctx,
  );
  const next = await newTemplate.poll!(
    { ...input, params: {}, state: seeded.nextState },
    mockCtx([{ body: [{ ...tpl("a"), Subject: "Changed" }] }]).ctx,
  );
  assertEquals(next.events, []);
  const full = Array.from({ length: 500 }, (_, i) => tpl(`t${i}`));
  await assertRejects(
    () => newTemplate.poll!({ ...input, params: {}, state: {} }, mockCtx([{ body: full }]).ctx),
    Error,
    "500 or more templates",
  );
});

test("new-contact-in-list: seeds, emits only the contact added since, retries idempotently", async () => {
  const params = { listName: "Newsletter" };
  const seeded = await newContact.poll!(
    { ...input, params, state: {} },
    mockCtx([{ body: [contact("a@x.test")] }, { body: [] }]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(seededOf(seeded.nextState), true);
  const run = () =>
    newContact.poll!(
      { ...input, params, state: seeded.nextState },
      mockCtx([{ body: [contact("a@x.test"), contact("b@x.test")] }, { body: [] }]).ctx,
    );
  const result = await run();
  assertEquals(result.events, [contact("b@x.test")]);
  assertEquals(await run(), result);
});

test("new-contact-in-list: requests GET /v4/lists/{name}/contacts page by page to an empty page (literal)", async () => {
  const m = mockCtx([{ body: [contact("a@x.test")] }, { body: [contact("b@x.test")] }, {
    body: [],
  }]);
  await newContact.poll!({ ...input, params: { listName: "My List/2" }, state: {} }, m.ctx);
  assertEquals(m.calls.length, 3);
  for (const c of m.calls) {
    assertEquals(c.method, "GET");
    assertEquals(pathOf(c.url), "/v4/lists/My%20List%2F2/contacts");
  }
  assertEquals(m.calls.map((c) => queryOf(c.url)), [
    { limit: "500", offset: "0" },
    { limit: "500", offset: "500" },
    { limit: "500", offset: "1000" },
  ]);
});

test("new-contact-in-list: a contact on a later page is seen; a list of 5000 fails naming the cap", async () => {
  const page = (n: number, from: number) =>
    Array.from({ length: n }, (_, i) => contact(`u${from + i}@x.test`));
  const params = { listName: "L" };
  const seeded = await newContact.poll!(
    { ...input, params, state: {} },
    mockCtx([{ body: page(500, 0) }, { body: page(1, 500) }, { body: [] }]).ctx,
  );
  const next = await newContact.poll!(
    { ...input, params, state: seeded.nextState },
    mockCtx([{ body: page(500, 0) }, { body: page(2, 500) }, { body: [] }]).ctx,
  );
  assertEquals(next.events, [contact("u501@x.test")]);
  await assertRejects(
    () =>
      newContact.poll!(
        { ...input, params, state: {} },
        mockCtx(Array.from({ length: 10 }, (_, i) => ({ body: page(500, i * 500) }))).ctx,
      ),
    Error,
    "5000 or more contacts",
  );
});

test("new-contact-in-list: a missing list name is refused before any request", async () => {
  const m = mockCtx();
  await assertRejects(
    () => newContact.poll!({ ...input, params: {}, state: {} }, m.ctx),
    Error,
    "List name is required",
  );
  assertEquals(m.calls.length, 0);
});
