import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import keyAdded from "../../triggers/key-added.ts";
import translationUpdated from "../../triggers/translation-updated.ts";
import taskCreated from "../../triggers/task-created.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-webhook-secret-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const API = "https://api.lokalise.com/api2";

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const bodyFor = (event: string | null, extra = `"key" : { "id": 1,  "name":"a.b" }`) =>
  `{ ${event === null ? "" : `"event" : "${event}",`}
  ${extra},
  "project" : { "id":"p1",  "name":"TheApp", "branch":"master" },
  "user":{"email":" ada@example.com ","full_name":"Ada"},
  "created_at":"2026-11-10 10:30:00", "created_at_timestamp": 1762770600 }`;

const call = (
  rawBody: string | null,
  over: { headers?: Record<string, string>; method?: string } = {},
  secret: string | null = SECRET,
) => ({
  raw: {
    method: over.method ?? "POST",
    path: "/",
    query: {},
    headers: over.headers ?? { "x-secret": SECRET },
    body: rawBody === null ? null : JSON.parse(rawBody),
    ...(rawBody === null ? {} : { rawBody }),
  },
  params: { projectId: "p1" },
  state: secret === null
    ? { projectId: "p1", webhookId: "wh1" }
    : { projectId: "p1", webhookId: "wh1", secret },
  subscriptionId: "sub_1",
});

const ingest = (t: typeof keyAdded, input: ReturnType<typeof call>) =>
  t.handleIngest!(input as never, mockCtx().ctx);

async function refused(fn: () => Promise<unknown>, includes: string) {
  try {
    await fn();
  } catch (err) {
    assert(err instanceof Error && err.message.includes(includes), `message: ${String(err)}`);
    return;
  }
  throw new Error("expected the delivery to be refused");
}

test("fixture body has non-canonical whitespace", () => {
  const b = bodyFor("project.key.added");
  assert(JSON.stringify(JSON.parse(b)) !== b);
});

test("app declares five webhook triggers with output and sample, no poll", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "key-added",
    "key-modified",
    "translation-updated",
    "task-created",
    "task-closed",
  ]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
  }
});

test("onSubscribe: POST /projects/{id}/webhooks with the literal body, stores id and secret", async () => {
  const m = mockCtx([{
    body: {
      project_id: "p1",
      webhook: { webhook_id: "wh1", secret: SECRET, events: ["project.translation.updated"] },
    },
  }]);
  const state = await translationUpdated.onSubscribe!(
    {
      params: { projectId: "p1", branch: "develop" },
      callbackUrl: CALLBACK,
      subscriptionId: "sub_1",
    } as never,
    m.ctx,
  );
  assertEquals(state, { projectId: "p1", webhookId: "wh1", secret: SECRET });
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "POST");
  assertEquals(m.calls[0].url, `${API}/projects/p1/webhooks`);
  assertEquals(JSON.parse(m.calls[0].body!), {
    url: CALLBACK,
    events: ["project.translation.updated"],
    branch: "develop",
  });
});

test("onSubscribe: a response without a secret rolls the webhook back and throws", async () => {
  const m = mockCtx([{ body: { webhook: { webhook_id: "wh1" } } }, { body: {} }]);
  await refused(
    () =>
      taskCreated.onSubscribe!(
        { params: { projectId: "p1" }, callbackUrl: CALLBACK, subscriptionId: "sub_1" } as never,
        m.ctx,
      ),
    "secret",
  );
  assertEquals(m.calls.map((c) => `${c.method} ${c.url}`), [
    `POST ${API}/projects/p1/webhooks`,
    `DELETE ${API}/projects/p1/webhooks/wh1`,
  ]);
});

test("onUnsubscribe: DELETE /projects/{id}/webhooks/{wid}; 404 = already gone, other errors throw", async () => {
  const ok = mockCtx([{ body: { project_id: "p1", webhook_deleted: true } }]);
  await keyAdded.onUnsubscribe!(
    {
      state: { projectId: "p1", webhookId: "wh1", secret: SECRET },
      subscriptionId: "sub_1",
    } as never,
    ok.ctx,
  );
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(ok.calls[0].url, `${API}/projects/p1/webhooks/wh1`);

  const gone = mockCtx([{ status: 404, body: { error: { message: "Not found", code: 404 } } }]);
  await keyAdded.onUnsubscribe!(
    {
      state: { projectId: "p1", webhookId: "wh1", secret: SECRET },
      subscriptionId: "sub_1",
    } as never,
    gone.ctx,
  );

  const boom = mockCtx([{ status: 500, body: { error: { message: "boom", code: 500 } } }]);
  await refused(
    () =>
      keyAdded.onUnsubscribe!(
        {
          state: { projectId: "p1", webhookId: "wh1", secret: SECRET },
          subscriptionId: "sub_1",
        } as never,
        boom.ctx,
      ),
    "Lokalise 500",
  );
});

test("valid X-Secret → one normalized event (single and bulk names)", async () => {
  const out = evs(await ingest(keyAdded, call(bodyFor("project.key.added")))) as Array<
    Record<string, unknown>
  >;
  assertEquals(out.length, 1);
  assertEquals(out[0].event, "project.key.added");
  assertEquals(out[0].projectId, "p1");
  assertEquals(out[0].userEmail, "ada@example.com");
  assertEquals(out[0].record, { id: 1, name: "a.b" });
  assertEquals(out[0].createdAtTimestamp, 1762770600);
  const bulk = evs(
    await ingest(keyAdded, call(bodyFor("project.keys.added", `"keys":[{"id":1},{"id":2}]`))),
  ) as Array<Record<string, unknown>>;
  assertEquals(bulk[0].record, [{ id: 1 }, { id: 2 }]);
});

test("another event, and the setup ping, are acknowledged with no event", async () => {
  assertEquals(evs(await ingest(keyAdded, call(bodyFor("project.key.modified")))), []);
  assertEquals(evs(await ingest(keyAdded, call(bodyFor(null)))), []);
});

test("wrong X-Secret, one flipped byte → refused", async () => {
  const flipped = SECRET.slice(0, -1) + (SECRET.endsWith("9") ? "8" : "9");
  await refused(
    () =>
      ingest(keyAdded, call(bodyFor("project.key.added"), { headers: { "x-secret": flipped } })),
    "does not match",
  );
});

test("X-Secret header missing → refused", async () => {
  await refused(
    () => ingest(keyAdded, call(bodyFor("project.key.added"), { headers: {} })),
    "missing",
  );
});

test("rawBody absent → refused", async () => {
  await refused(() => ingest(keyAdded, call(null)), "raw body");
});

test("unset or empty stored secret → refused, even with an empty header", async () => {
  for (const secret of [null, ""]) {
    await refused(() => ingest(keyAdded, call(bodyFor("project.key.added"), {}, secret)), "secret");
    await refused(
      () =>
        ingest(
          keyAdded,
          call(bodyFor("project.key.added"), { headers: { "x-secret": "" } }, secret),
        ),
      "secret",
    );
  }
});

test("a non-POST request and a non-object body are refused", async () => {
  await refused(
    () => ingest(keyAdded, call(bodyFor("project.key.added"), { method: "GET" })),
    "POST",
  );
  await refused(() => ingest(keyAdded, call("[1]")), "Not a Lokalise");
});

test("errors never contain the secret or the header value", async () => {
  const bad = `${SECRET}-wrong`;
  try {
    await ingest(keyAdded, call(bodyFor("project.key.added"), { headers: { "x-secret": bad } }));
    throw new Error("should have thrown");
  } catch (err) {
    const m = (err as Error).message;
    assert(!m.includes(SECRET) && !m.includes(bad));
  }
});
