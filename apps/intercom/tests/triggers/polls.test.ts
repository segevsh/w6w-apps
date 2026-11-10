import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newNote from "../../triggers/new-note.ts";
import newTag from "../../triggers/new-tag.ts";

const base = { subscriptionId: "sub-1" };
const note = (id: string) => ({ type: "note", id, body: `<p>${id}</p>`, created_at: 1762683400 });
const tag = (id: string, name = `Tag ${id}`) => ({ type: "tag", id, name });

// ---- new-note (newest-first, GET /contacts/{id}/notes, order defaults to desc) ----

const noteInput = { ...base, params: { contactId: "c-1" } };
const notePage = (...ids: string[]) => ({ body: { type: "list", data: ids.map(note) } });

test("new-note: unseeded state seeds from page 1 and emits nothing", async () => {
  const { ctx } = mockCtx([notePage("30", "20", "10")]);
  const out = await newNote.poll!({ ...noteInput, state: {} }, ctx);
  assertEquals(out.events, []);
  assertEquals((out.nextState as { seeded?: boolean }).seeded, true);
});

test("new-note: from the seeded state exactly the new note is emitted, oldest first", async () => {
  const seeded = await newNote.poll!(
    { ...noteInput, state: {} },
    mockCtx([notePage("30", "20", "10")]).ctx,
  );
  const out = await newNote.poll!(
    { ...noteInput, state: seeded.nextState },
    mockCtx([notePage("50", "40", "30", "20", "10")]).ctx,
  );
  assertEquals(out.events, [note("40"), note("50")]);
});

test("new-note: the same state and responses twice give deep-equal results", async () => {
  const seeded = await newNote.poll!(
    { ...noteInput, state: {} },
    mockCtx([notePage("20", "10")]).ctx,
  );
  const run = () =>
    newNote.poll!({ ...noteInput, state: seeded.nextState }, mockCtx([notePage("30", "20")]).ctx);
  assertEquals(await run(), await run());
});

test("new-note: the request is GET /contacts/{id}/notes with no sort override (doc default desc)", async () => {
  const { ctx, calls } = mockCtx([notePage("10")]);
  await newNote.poll!({ ...noteInput, state: {} }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.intercom.io/contacts/c-1/notes");
});

test("new-note: a contact id is percent-encoded into the path", async () => {
  const { ctx, calls } = mockCtx([notePage("10")]);
  await newNote.poll!({ ...base, params: { contactId: "a/b" }, state: {} }, ctx);
  assertEquals(calls[0].url, "https://api.intercom.io/contacts/a%2Fb/notes");
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
