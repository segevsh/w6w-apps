import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newNote from "../../triggers/new-note.ts";
import newTag from "../../triggers/new-tag.ts";

const base = { subscriptionId: "sub-1" };
// A later note has a larger id and a later `created_at`, as on the real API.
const note = (id: string) => ({
  type: "note",
  id,
  body: `<p>${id}</p>`,
  created_at: 1762683000 + Number(id),
});
const tag = (id: string, name = `Tag ${id}`) => ({ type: "tag", id, name });

// ---- new-note (order-independent snapshot, GET /contacts/{id}/notes?page&per_page) ----

const noteInput = { ...base, params: { contactId: "c-1" } };
/** One page of the notes list; `totalPages` mirrors `pages.total_pages` of the 2.11 response. */
const notePage = (ids: string[], page = 1, totalPages = 1) => ({
  body: {
    type: "list",
    data: ids.map(note),
    total_count: ids.length,
    pages: { type: "pages", page, per_page: 50, total_pages: totalPages },
  },
});
const ids = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

test("new-note: unseeded state seeds from the notes and emits nothing", async () => {
  const { ctx } = mockCtx([notePage(["30", "20", "10"])]);
  const out = await newNote.poll!({ ...noteInput, state: {} }, ctx);
  assertEquals(out.events, []);
  assertEquals((out.nextState as { seeded?: boolean }).seeded, true);
});

test("new-note: a descending list: exactly the new notes are emitted, oldest first", async () => {
  const seeded = await newNote.poll!(
    { ...noteInput, state: {} },
    mockCtx([notePage(["30", "20", "10"])]).ctx,
  );
  const out = await newNote.poll!(
    { ...noteInput, state: seeded.nextState },
    mockCtx([notePage(["50", "40", "30", "20", "10"])]).ctx,
  );
  assertEquals(out.events, [note("40"), note("50")]);
});

test("new-note: an ASCENDING list over 3 pages, new note on the LAST page, is emitted once", async () => {
  const seedPages = [
    notePage(ids(1, 50), 1, 3),
    notePage(ids(51, 100), 2, 3),
    notePage(ids(101, 120), 3, 3),
  ];
  const seeded = await newNote.poll!({ ...noteInput, state: {} }, mockCtx(seedPages).ctx);
  assertEquals(seeded.events, []);
  const { ctx, calls } = mockCtx([
    notePage(ids(1, 50), 1, 3),
    notePage(ids(51, 100), 2, 3),
    notePage([...ids(101, 120), "121"], 3, 3),
  ]);
  const out = await newNote.poll!({ ...noteInput, state: seeded.nextState }, ctx);
  assertEquals(out.events, [note("121")]);
  assertEquals(calls.map((c) => c.url), [
    "https://api.intercom.io/contacts/c-1/notes?page=1&per_page=50",
    "https://api.intercom.io/contacts/c-1/notes?page=2&per_page=50",
    "https://api.intercom.io/contacts/c-1/notes?page=3&per_page=50",
  ]);
});

test("new-note: a descending multi-page list with the new note on page 1 is emitted once", async () => {
  const seeded = await newNote.poll!(
    { ...noteInput, state: {} },
    mockCtx([notePage(ids(2, 51).reverse(), 1, 2), notePage(["1"], 2, 2)]).ctx,
  );
  const out = await newNote.poll!(
    { ...noteInput, state: seeded.nextState },
    mockCtx([notePage(["52", ...ids(2, 51).reverse()].slice(0, 50), 1, 2), notePage(["1"], 2, 2)])
      .ctx,
  );
  assertEquals(out.events, [note("52")]);
});

test("new-note: a note read on two pages (the list shifted while paging) is emitted once", async () => {
  const seeded = await newNote.poll!(
    { ...noteInput, state: {} },
    mockCtx([notePage(["1"])]).ctx,
  );
  const out = await newNote.poll!(
    { ...noteInput, state: seeded.nextState },
    mockCtx([notePage(["1", "2"], 1, 2), notePage(["2", "3"], 2, 2)]).ctx,
  );
  assertEquals(out.events, [note("2"), note("3")]);
});

test("new-note: events are ordered by creation time, whatever the list order", async () => {
  const seeded = await newNote.poll!({ ...noteInput, state: {} }, mockCtx([notePage(["1"])]).ctx);
  const at = (id: string, created_at: number) => ({ ...note(id), created_at });
  const out = await newNote.poll!(
    { ...noteInput, state: seeded.nextState },
    mockCtx([{
      body: { type: "list", data: [at("9", 300), at("1", 100), at("5", 200)], pages: {} },
    }]).ctx,
  );
  assertEquals(out.events.map((e) => (e as { id: string }).id), ["5", "9"]);
});

test("new-note: an edited note is not a new note", async () => {
  const seeded = await newNote.poll!({ ...noteInput, state: {} }, mockCtx([notePage(["1"])]).ctx);
  const out = await newNote.poll!(
    { ...noteInput, state: seeded.nextState },
    mockCtx([{ body: { type: "list", data: [{ ...note("1"), body: "<p>edited</p>" }] } }]).ctx,
  );
  assertEquals(out.events, []);
});

test("new-note: the same state and responses twice give deep-equal results", async () => {
  const seeded = await newNote.poll!(
    { ...noteInput, state: {} },
    mockCtx([notePage(["20", "10"])]).ctx,
  );
  const run = () =>
    newNote.poll!(
      { ...noteInput, state: seeded.nextState },
      mockCtx([notePage(["30", "20", "10"])]).ctx,
    );
  assertEquals(await run(), await run());
});

test("new-note: without pages.total_pages a full page asks for the next, a short one stops", async () => {
  const full = (n: number) => ({ body: { type: "list", data: ids(1, n).map(note) } });
  const { ctx, calls } = mockCtx([full(50), full(3)]);
  await newNote.poll!({ ...noteInput, state: {} }, ctx);
  assertEquals(calls.length, 2);
  const one = mockCtx([full(3)]);
  await newNote.poll!({ ...noteInput, state: {} }, one.ctx);
  assertEquals(one.calls.length, 1);
});

test("new-note: more than 100 pages of notes is refused, never silently truncated", async () => {
  const pages = Array.from(
    { length: 100 },
    (_, i) => notePage(ids(i * 50 + 1, i * 50 + 50), i + 1, 101),
  );
  const { ctx, calls } = mockCtx(pages);
  await assertRejects(() => newNote.poll!({ ...noteInput, state: {} }, ctx), Error, "100 pages");
  assertEquals(calls.length, 100);
});

test("new-note: the request is GET /contacts/{id}/notes with explicit page and per_page", async () => {
  const { ctx, calls } = mockCtx([notePage(["10"])]);
  await newNote.poll!({ ...noteInput, state: {} }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.intercom.io/contacts/c-1/notes?page=1&per_page=50");
});

test("new-note: a contact id is percent-encoded into the path", async () => {
  const { ctx, calls } = mockCtx([notePage(["10"])]);
  await newNote.poll!({ ...base, params: { contactId: "a/b" }, state: {} }, ctx);
  assertEquals(calls[0].url, "https://api.intercom.io/contacts/a%2Fb/notes?page=1&per_page=50");
});

test("new-note: declares a required contactId, output and sample, and no onSubscribe", () => {
  assertEquals(newNote.params?.map((p) => [p.key, p.type, p.required]), [[
    "contactId",
    "string",
    true,
  ]]);
  assert(newNote.output!.length > 0 && newNote.sample !== undefined);
  assertEquals(newNote.onSubscribe, undefined);
  assertEquals(typeof newNote.poll, "function");
  assertEquals(newNote.minIntervalMs, 300_000);
});

// ---- new-tag (bounded snapshot, GET /tags) ----

const tagsOf = (...tags: unknown[]) => ({ body: { type: "list", data: tags } });

test("new-tag: seeds without emitting, then emits only the added tag and ignores a rename", async () => {
  const seed = mockCtx([tagsOf(tag("1"), tag("2"))]);
  const seeded = await newTag.poll!({ ...base, params: {}, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const page = [tag("1", "Renamed"), tag("2"), tag("3")];
  const first = await newTag.poll!(
    { ...base, params: {}, state: seeded.nextState },
    mockCtx([tagsOf(...page)]).ctx,
  );
  assertEquals(first.events, [tag("3")]);
  const retry = await newTag.poll!(
    { ...base, params: {}, state: seeded.nextState },
    mockCtx([tagsOf(...page)]).ctx,
  );
  assertEquals(retry, first);
});

test("new-tag: the request is GET /tags", async () => {
  const { ctx, calls } = mockCtx([tagsOf(tag("1"))]);
  await newTag.poll!({ ...base, params: {}, state: {} }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.intercom.io/tags");
});

test("new-tag: more than 5000 tags is refused (the kit cap), and the rest of the run stays defined", async () => {
  const many = Array.from({ length: 5001 }, (_, i) => tag(String(i)));
  await assertRejects(
    () => newTag.poll!({ ...base, params: {}, state: {} }, mockCtx([tagsOf(...many)]).ctx),
    Error,
    "5000",
  );
  assertEquals(newTag.minIntervalMs, 300_000);
  assert(newTag.output!.length > 0 && newTag.sample !== undefined);
});
