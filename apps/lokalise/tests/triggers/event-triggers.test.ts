import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import anyEvent from "../../triggers/any-event.ts";
import commentAdded from "../../triggers/comment-added.ts";
import contributorAdded from "../../triggers/contributor-added.ts";
import contributorDeleted from "../../triggers/contributor-deleted.ts";
import fileImported from "../../triggers/file-imported.ts";
import keyDeleted from "../../triggers/key-deleted.ts";
import languageAdded from "../../triggers/language-added.ts";
import taskDeleted from "../../triggers/task-deleted.ts";
import translationProofread from "../../triggers/translation-proofread.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-webhook-secret-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const API = "https://api.lokalise.com/api2";

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const bodyFor = (event: string | null, extra: string) =>
  `{ ${event === null ? "" : `"event" : "${event}",`}
  ${extra},
  "project" : { "id":"p1",  "name":"TheApp", "branch":"master" },
  "user":{"email":" ada@example.com ","full_name":"Ada"},
  "created_at":"2026-11-10 10:30:00", "created_at_timestamp": 1762770600 }`;

const call = (
  rawBody: string | null,
  over: { headers?: Record<string, string> } = {},
  secret: string | null = SECRET,
  params: Record<string, unknown> = { projectId: "p1" },
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: over.headers ?? { "x-secret": SECRET },
    body: rawBody === null ? null : JSON.parse(rawBody),
    ...(rawBody === null ? {} : { rawBody }),
  },
  params,
  state: secret === null
    ? { projectId: "p1", webhookId: "wh1" }
    : { projectId: "p1", webhookId: "wh1", secret },
  subscriptionId: "sub_1",
});

type Trig = typeof keyDeleted;
const ingest = (t: Trig, input: ReturnType<typeof call>) =>
  t.handleIngest!(input as never, mockCtx().ctx);

async function refused(fn: () => Promise<unknown> | unknown, includes: string) {
  try {
    await fn();
  } catch (err) {
    assert(err instanceof Error && err.message.includes(includes), `message: ${String(err)}`);
    return;
  }
  throw new Error("expected the call to be refused");
}

async function subscribeBody(t: Trig, params: Record<string, unknown>) {
  const m = mockCtx([{
    body: { project_id: "p1", webhook: { webhook_id: "wh1", secret: SECRET } },
  }]);
  const state = await t.onSubscribe!(
    { params, callbackUrl: CALLBACK, subscriptionId: "sub_1" } as never,
    m.ctx,
  );
  assertEquals(state, { projectId: "p1", webhookId: "wh1", secret: SECRET });
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "POST");
  assertEquals(m.calls[0].url, `${API}/projects/p1/webhooks`);
  return JSON.parse(m.calls[0].body!);
}

interface Case {
  name: string;
  t: Trig;
  event: string;
  extra: string;
  record: unknown;
  /** An event this trigger must NOT emit. */
  other: string;
}

const CASES: Case[] = [
  {
    name: "key-deleted",
    t: keyDeleted,
    event: "project.keys.deleted",
    extra: `"action" : "lokalise", "keys":[{"id":16307699, "name":"test.title_modified"}]`,
    record: [{ id: 16307699, name: "test.title_modified" }],
    other: "project.key.added",
  },
  {
    name: "comment-added",
    t: commentAdded,
    event: "project.key.comment.added",
    extra: `"comment" : { "value":"My comment" }, "key":{"id":7, "name":"a.b"}`,
    record: { value: "My comment" },
    other: "project.key.added",
  },
  {
    name: "contributor-added",
    t: contributorAdded,
    event: "project.contributor.added",
    extra: `"contributor" : { "email":"grace@example.com" }`,
    record: { email: "grace@example.com" },
    other: "project.contributor.deleted",
  },
  {
    name: "contributor-deleted",
    t: contributorDeleted,
    event: "project.contributor.deleted",
    extra: `"contributor" : { "email":"grace@example.com" }`,
    record: { email: "grace@example.com" },
    other: "project.contributor.added",
  },
  {
    name: "language-added",
    t: languageAdded,
    event: "project.languages.added",
    extra: `"languages" : [ { "id":734,  "iso":"it", "name":"Italian" } ]`,
    record: [{ id: 734, iso: "it", name: "Italian" }],
    other: "project.language.settings_changed",
  },
  {
    name: "translation-proofread (single)",
    t: translationProofread,
    event: "project.translation.proofread",
    extra:
      `"translation" : { "id":84835169, "value":"Hi", "is_proofread": true }, "language":{"id":597, "iso":"en"}, "key":{"id":16307701, "name":"test.title"}`,
    record: { id: 84835169, value: "Hi", is_proofread: true },
    other: "project.translation.updated",
  },
  {
    name: "translation-proofread (bulk)",
    t: translationProofread,
    event: "project.translations.proofread",
    extra:
      `"translations" : [ { "id":1, "is_proofread": false } ], "language":{"id":597, "iso":"en"}, "key":{"id":16307701, "name":"test.title"}`,
    record: [{ id: 1, is_proofread: false }],
    other: "project.translation.updated",
  },
  {
    name: "file-imported",
    t: fileImported,
    event: "project.imported",
    extra:
      `"import" : { "filename":"ru.yml", "format":"yml", "inserted": 231, "updated":0, "skipped":0 }, "language":{"id":597}`,
    record: { filename: "ru.yml", format: "yml", inserted: 231, updated: 0, skipped: 0 },
    other: "project.exported",
  },
  {
    name: "task-deleted",
    t: taskDeleted,
    event: "project.task.deleted",
    extra: `"task" : { "id":5022, "type":"translation", "title":"Headings" }`,
    record: { id: 5022, type: "translation", title: "Headings" },
    other: "project.task.closed",
  },
];

test("fixture body has non-canonical whitespace", () => {
  const b = bodyFor("project.keys.deleted", `"keys":[]`);
  assert(JSON.stringify(JSON.parse(b)) !== b);
});

test("the app now declares 14 webhook triggers + 1 poll, every one with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "key-added",
    "key-modified",
    "translation-updated",
    "task-created",
    "task-closed",
    "key-deleted",
    "comment-added",
    "contributor-added",
    "contributor-deleted",
    "language-added",
    "translation-proofread",
    "file-imported",
    "task-deleted",
    "any-event",
    "new-project",
  ]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
  }
});

test("subscriptions register exactly the vendor event each trigger names", async () => {
  assertEquals(await subscribeBody(keyDeleted, { projectId: "p1" }), {
    url: CALLBACK,
    events: ["project.keys.deleted"],
  });
  assertEquals(await subscribeBody(commentAdded, { projectId: "p1", branch: "dev" }), {
    url: CALLBACK,
    events: ["project.key.comment.added"],
    branch: "dev",
  });
  assertEquals((await subscribeBody(contributorAdded, { projectId: "p1" })).events, [
    "project.contributor.added",
  ]);
  assertEquals((await subscribeBody(contributorDeleted, { projectId: "p1" })).events, [
    "project.contributor.deleted",
  ]);
  assertEquals((await subscribeBody(languageAdded, { projectId: "p1" })).events, [
    "project.languages.added",
  ]);
  assertEquals((await subscribeBody(translationProofread, { projectId: "p1" })).events, [
    "project.translation.proofread",
  ]);
  assertEquals((await subscribeBody(fileImported, { projectId: "p1" })).events, [
    "project.imported",
  ]);
  assertEquals((await subscribeBody(taskDeleted, { projectId: "p1" })).events, [
    "project.task.deleted",
  ]);
});

for (const c of CASES) {
  test(`${c.name}: valid X-Secret → one event with the object; another event → none`, async () => {
    const out = evs(await ingest(c.t, call(bodyFor(c.event, c.extra)))) as Array<
      Record<string, unknown>
    >;
    assertEquals(out.length, 1);
    assertEquals(out[0].event, c.event);
    assertEquals(out[0].projectId, "p1");
    assertEquals(out[0].userEmail, "ada@example.com");
    assertEquals(out[0].record, c.record);
    assertEquals(evs(await ingest(c.t, call(bodyFor(c.other, c.extra)))), []);
    assertEquals(evs(await ingest(c.t, call(bodyFor(null, c.extra)))), []); // setup ping
  });

  test(`${c.name}: one flipped byte of the secret, missing header, no rawBody, unset secret → refused`, async () => {
    const body = bodyFor(c.event, c.extra);
    const flipped = SECRET.slice(0, -1) + (SECRET.endsWith("9") ? "8" : "9");
    await refused(
      () => ingest(c.t, call(body, { headers: { "x-secret": flipped } })),
      "does not match",
    );
    await refused(() => ingest(c.t, call(body, { headers: {} })), "missing");
    await refused(() => ingest(c.t, call(null)), "raw body");
    for (const secret of [null, ""]) {
      await refused(
        () => ingest(c.t, call(body, { headers: { "x-secret": "" } }, secret)),
        "secret",
      );
    }
  });
}

const ALL = [
  "project.branch.added",
  "project.branch.deleted",
  "project.branch.merged",
  "project.contributor.added",
  "project.contributor.deleted",
  "project.deleted",
  "project.exported",
  "project.imported",
  "project.key.added",
  "project.key.comment.added",
  "project.key.modified",
  "project.keys.deleted",
  "project.language.settings_changed",
  "project.languages.added",
  "project.snapshot",
  "project.task.closed",
  "project.task.created",
  "project.task.deleted",
  "project.task.language.closed",
  "project.translation.proofread",
  "project.translation.updated",
  "team.order.completed",
  "team.order.created",
  "team.order.deleted",
];

test("any-event: empty events subscribes to every event the webhook API accepts", async () => {
  assertEquals(await subscribeBody(anyEvent, { projectId: "p1" }), { url: CALLBACK, events: ALL });
  assertEquals((await subscribeBody(anyEvent, { projectId: "p1", events: "  " })).events, ALL);
});

test("any-event: a list subscribes to just those, bulk names mapped to their singular", async () => {
  assertEquals(
    (await subscribeBody(anyEvent, {
      projectId: "p1",
      events: "project.keys.added, project.key.added,project.task.closed,project.language.removed",
    })).events,
    ["project.key.added", "project.task.closed", "project.language.removed"],
  );
});

test("any-event: a malformed event name is refused at subscribe time, before any request", async () => {
  const m = mockCtx([]);
  await refused(
    () =>
      anyEvent.onSubscribe!(
        {
          params: { projectId: "p1", events: "project.key.added, drop table" },
          callbackUrl: CALLBACK,
          subscriptionId: "sub_1",
        } as never,
        m.ctx,
      ),
    "not a Lokalise event name",
  );
  assertEquals(m.calls.length, 0);
});

test("any-event: empty filter lets every event through; a list keeps only those (and bulk twins)", async () => {
  const snap = bodyFor("project.snapshot", `"note":"x"`);
  const keys = bodyFor("project.keys.added", `"keys":[{"id":1},{"id":2}]`);
  const task = bodyFor("project.task.closed", `"task":{"id":9}`);
  const all = call(snap);
  assertEquals(
    (evs(await ingest(anyEvent, all)) as Array<{ event: string }>).map((e) => e.event),
    ["project.snapshot"],
  );
  assertEquals(
    (evs(await ingest(anyEvent, call(keys))) as Array<{ event: string }>).length,
    1,
  );

  const params = { projectId: "p1", events: "project.key.added,project.task.closed" };
  assertEquals(evs(await ingest(anyEvent, call(snap, {}, SECRET, params))), []);
  const kept = evs(await ingest(anyEvent, call(keys, {}, SECRET, params))) as Array<
    Record<string, unknown>
  >;
  assertEquals(kept.length, 1);
  assertEquals(kept[0].record, [{ id: 1 }, { id: 2 }]);
  const closed = evs(await ingest(anyEvent, call(task, {}, SECRET, params))) as Array<
    Record<string, unknown>
  >;
  assertEquals(closed[0].record, { id: 9 });
});

test("any-event: the filter is applied after verification — a forged delivery is refused first", async () => {
  const params = { projectId: "p1", events: "project.task.closed" };
  const flipped = SECRET.slice(0, -1) + (SECRET.endsWith("9") ? "8" : "9");
  await refused(
    () =>
      ingest(
        anyEvent,
        call(
          bodyFor("project.snapshot", `"a":1`),
          { headers: { "x-secret": flipped } },
          SECRET,
          params,
        ),
      ),
    "does not match",
  );
  await refused(
    () => ingest(anyEvent, call(bodyFor("project.snapshot", `"a":1`), {}, null, params)),
    "secret",
  );
  await refused(() => ingest(anyEvent, call(null, {}, SECRET, params)), "raw body");
  await refused(
    () => ingest(anyEvent, call(bodyFor("project.snapshot", `"a":1`), { headers: {} })),
    "missing",
  );
});
