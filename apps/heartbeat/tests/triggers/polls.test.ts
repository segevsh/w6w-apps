import { test } from "node:test";
import nodeAssert from "node:assert/strict";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import newChannel from "../../triggers/new-channel.ts";
import newChannelCategory from "../../triggers/new-channel-category.ts";
import newGroup from "../../triggers/new-group.ts";
import newCourse from "../../triggers/new-course.ts";
import newInvitation from "../../triggers/new-invitation.ts";
import newVideo from "../../triggers/new-video.ts";
import newDirectMessage from "../../triggers/new-direct-message.ts";

const input = (state: unknown, params: Record<string, unknown> = {}) => ({
  params,
  state,
  subscriptionId: "sub_1",
});

// Each snapshot trigger: the bare array Heartbeat answers (no envelope), and the LITERAL
// request its list action makes (GET, path, no query).
const snapshots = [
  { t: newChannel, key: "new-channel", path: "/v0/channels" },
  { t: newChannelCategory, key: "new-channel-category", path: "/v0/channelCategories" },
  { t: newGroup, key: "new-group", path: "/v0/groups" },
  { t: newCourse, key: "new-course", path: "/v0/courses" },
  { t: newInvitation, key: "new-invitation", path: "/v0/invitations" },
  { t: newVideo, key: "new-video", path: "/v0/videos" },
];

const rows = (...ids: string[]) => ids.map((id) => ({ id, name: `Row ${id}` }));

for (const { t, key, path } of snapshots) {
  test(`${key}: declares output and sample, poll only, interval set`, () => {
    assertEquals(t.key, key);
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(typeof t.poll, "function");
    assertEquals(t.onSubscribe, undefined);
    assertEquals(t.minIntervalMs, 300_000);
  });

  test(`${key}: seeds without events, then emits only the new row, and a retry is identical`, async () => {
    const seed = mockCtx([{ body: rows("a", "b") }]);
    const seeded = await t.poll!(input({}), seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls.length, 1);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(new URL(seed.calls[0].url).pathname, path);
    assertEquals(new URL(seed.calls[0].url).search, "");

    const first = await t.poll!(
      input(seeded.nextState),
      mockCtx([{ body: rows("a", "b", "c") }]).ctx,
    );
    const retry = await t.poll!(
      input(seeded.nextState),
      mockCtx([{ body: rows("a", "b", "c") }]).ctx,
    );
    assertEquals(first.events, [{ id: "c", name: "Row c" }]);
    assertEquals(retry, first);

    const again = await t.poll!(
      input(first.nextState),
      mockCtx([{ body: rows("a", "b", "c") }]).ctx,
    );
    assertEquals(again.events, []);
  });

  test(`${key}: an edited row is not an event; a row without an id is ignored`, async () => {
    const seeded = await t.poll!(input({}), mockCtx([{ body: rows("a") }]).ctx);
    const out = await t.poll!(
      input(seeded.nextState),
      mockCtx([{ body: [{ id: "a", name: "Renamed" }, { name: "no id" }] }]).ctx,
    );
    assertEquals(out.events, []);
  });

  test(`${key}: an answer without a list throws and leaves the baseline alone`, async () => {
    const seeded = await t.poll!(input({}), mockCtx([{ body: rows("a") }]).ctx);
    for (const body of [{}, null, 5]) {
      await nodeAssert.rejects(
        () => t.poll!(input(seeded.nextState), mockCtx([{ body }]).ctx),
        (e: unknown) => e instanceof Error && e.message.includes("without a list"),
      );
    }
    // The state the failed checks started from still has "a" in it: no re-emit afterwards.
    const after = await t.poll!(
      input(seeded.nextState),
      mockCtx([{ body: rows("a") }]).ctx,
    );
    assertEquals(after.events, []);
  });
}

/** Every declared output key resolves in the sample, and its sample value has the declared type. */
function assertSampleMatchesOutput(t: typeof newInvitation) {
  const sample = t.sample as Record<string, unknown>;
  const typeOf = (v: unknown) => Array.isArray(v) ? "array" : v === null ? "null" : typeof v;
  const check = (fields: NonNullable<typeof t.output>, value: unknown, at: string) => {
    for (const f of fields) {
      let v: unknown = value;
      for (const part of f.key.split(".")) v = (v as Record<string, unknown> | undefined)?.[part];
      assertEquals(typeOf(v), f.type, `${at}${f.key}`);
      if (f.type === "array" && f.items) {
        assert((v as unknown[]).length > 0, `${at}${f.key} sample has an element`);
        check(f.items, (v as unknown[])[0], `${at}${f.key}[0].`);
      }
    }
  };
  check(t.output!, sample, "");
}

test("new-invitation: the sample has the vendor's object shapes (role {id,name}, groups [{id,name}])", () => {
  assertSampleMatchesOutput(newInvitation);
  const sample = newInvitation.sample as {
    role: Record<string, unknown>;
    groups: Record<string, unknown>[];
  };
  assertEquals(Object.keys(sample.role).sort(), ["id", "name"]);
  assertEquals(Object.keys(sample.groups[0]).sort(), ["id", "name"]);
  assertEquals(
    newInvitation.output!.filter((f) => f.key.startsWith("role")).map((f) => [f.key, f.type]),
    [["role", "object"], ["role.id", "string"], ["role.name", "string"]],
  );
});

test("new-course: the sample has the vendor's category object {id,name}", () => {
  assertSampleMatchesOutput(newCourse);
  const sample = newCourse.sample as { category: Record<string, unknown> };
  assertEquals(Object.keys(sample.category).sort(), ["id", "name"]);
  assertEquals(
    newCourse.output!.filter((f) => f.key.startsWith("category")).map((f) => [f.key, f.type]),
    [["category", "object"], ["category.id", "string"], ["category.name", "string"]],
  );
});

test("new-video: more than 5000 videos is refused with the kit cap named, not silently truncated", async () => {
  const many = Array.from({ length: 5001 }, (_, i) => ({ id: `v${i}` }));
  await nodeAssert.rejects(
    () => newVideo.poll!(input({}), mockCtx([{ body: many }]).ctx),
    (e: unknown) => e instanceof Error && e.message.includes("5000"),
  );
});

// ---- new-direct-message (newest-first shape, explicit sort) ---------------------------------

const CHAT = "chat-1";
const msg = (n: number) => ({
  id: `m${n}`,
  userID: "u-1",
  content: `<p>${n}</p>`,
  createdAt: `2026-11-10T09:0${n}:00.000Z`,
});

test("new-direct-message: needs a chat id param and declares output and sample", () => {
  assertEquals(newDirectMessage.params!.map((p) => [p.key, p.required]), [["chatID", true]]);
  assert(newDirectMessage.output!.length > 0);
  assert(newDirectMessage.sample !== undefined);
  assertEquals(newDirectMessage.minIntervalMs, 300_000);
});

test("new-direct-message: seeds, then emits only the new message, retry identical, literal request", async () => {
  const p = { chatID: CHAT };
  const seed = mockCtx([{ body: [msg(2), msg(1)] }]);
  const seeded = await newDirectMessage.poll!(input({}, p), seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(new URL(seed.calls[0].url).pathname, "/v0/directMessages/chat-1");
  assertEquals(new URL(seed.calls[0].url).search, "");

  const page = () => mockCtx([{ body: [msg(3), msg(2), msg(1)] }]);
  const first = await newDirectMessage.poll!(input(seeded.nextState, p), page().ctx);
  const retry = await newDirectMessage.poll!(input(seeded.nextState, p), page().ctx);
  assertEquals(first.events, [msg(3)]);
  assertEquals(retry, first);
});

test("new-direct-message: the array's own order does not matter - several new messages arrive oldest-first", async () => {
  const p = { chatID: CHAT };
  const seeded = await newDirectMessage.poll!(
    input({}, p),
    mockCtx([{ body: [msg(1), msg(2)] }]).ctx,
  );
  // Heartbeat documents "the 100 most recent" but not their order; here oldest-first.
  const asc = await newDirectMessage.poll!(
    input(seeded.nextState, p),
    mockCtx([{ body: [msg(1), msg(2), msg(3), msg(4)] }]).ctx,
  );
  assertEquals(asc.events, [msg(3), msg(4)]);
  const desc = await newDirectMessage.poll!(
    input(seeded.nextState, p),
    mockCtx([{ body: [msg(4), msg(3), msg(2), msg(1)] }]).ctx,
  );
  assertEquals(desc.events, [msg(3), msg(4)]);
});

test("new-direct-message: a message without createdAt keeps the array as it came, and still dedupes", async () => {
  const p = { chatID: CHAT };
  const bare = (id: string) => ({ id, content: id });
  const seeded = await newDirectMessage.poll!(
    input({}, p),
    mockCtx([{ body: [bare("x"), bare("y")] }]).ctx,
  );
  const out = await newDirectMessage.poll!(
    input(seeded.nextState, p),
    mockCtx([{ body: [bare("z"), bare("x"), bare("y")] }]).ctx,
  );
  assertEquals(out.events, [bare("z")]);
});

test("new-direct-message: a chat id with a slash is encoded in the path", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await newDirectMessage.poll!(input({}, { chatID: " a/b " }), ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v0/directMessages/a%2Fb");
});

test("the app registers all nineteen triggers, each with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "user-joined",
    "user-updated",
    "thread-created",
    "group-joined",
    "event-created",
    "event-rsvp",
    "course-completed",
    "document-created",
    "mention",
    "direct-message",
    "abandoned-invitation",
    "any-event",
    "new-channel",
    "new-channel-category",
    "new-group",
    "new-course",
    "new-invitation",
    "new-video",
    "new-direct-message",
  ]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0, t.key);
    assert(t.sample !== undefined, t.key);
    assertEquals(typeof t.poll === "function", typeof t.onSubscribe !== "function", t.key);
  }
});
