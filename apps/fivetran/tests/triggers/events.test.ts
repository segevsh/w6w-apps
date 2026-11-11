import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { TriggerDefinition } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import anyEvent from "../../triggers/any-event.ts";
import connectionCreated from "../../triggers/connection-created.ts";
import connectionUpdated from "../../triggers/connection-updated.ts";
import connectionDeleted from "../../triggers/connection-deleted.ts";
import connectionPaused from "../../triggers/connection-paused.ts";
import connectionResumed from "../../triggers/connection-resumed.ts";
import connectionSuccessful from "../../triggers/connection-successful.ts";
import transformationStarted from "../../triggers/transformation-started.ts";
import transformationSucceeded from "../../triggers/transformation-succeeded.ts";
import transformationFailed from "../../triggers/transformation-failed.ts";

const SECRET = "test-secret-0123456789abcdef0123";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_7";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// Independent of app code: node:crypto, hex HMAC-SHA256 of the exact body.
const sign = (b: string, secret = SECRET) => createHmac("sha256", secret).update(b).digest("hex");
/** The same signature with its last hex digit changed: ONE flipped byte of the signature itself. */
const flipLast = (sig: string) => sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const body = (event: string) =>
  `{ "event" : "${event}",  "created":"2026-11-10T09:30:00.386Z",
  "connector_type":"postgres", "connector_id":"mystified_presiding",
  "connector_name":"mystified_presiding", "destination_group_id":"deck_enjoy",
  "data": { "note" : "x" } }`;

type Input = Parameters<NonNullable<TriggerDefinition["handleIngest"]>>[0];
function input(
  b: string | undefined,
  headers: Record<string, string>,
  over: { secret?: string | null; params?: Record<string, unknown>; method?: string } = {},
): Input {
  const secret = over.secret === undefined ? SECRET : over.secret;
  return {
    raw: {
      method: over.method ?? "POST",
      path: "/",
      query: {},
      headers,
      body: b === undefined ? null : JSON.parse(b),
      ...(b === undefined ? {} : { rawBody: b }),
    },
    params: over.params ?? {},
    state: secret === null ? {} : { webhookId: "wh_1", secret },
    subscriptionId: "sub_7",
  } as Input;
}
const run = (t: TriggerDefinition, i: Input) =>
  Promise.resolve().then(() => t.handleIngest!(i, mockCtx().ctx));
const HDR = "x-fivetran-signature-256";

const NAMED: Array<[TriggerDefinition, string]> = [
  [connectionCreated, "create_connector"],
  [connectionUpdated, "edit_connector"],
  [connectionDeleted, "delete_connector"],
  [connectionPaused, "pause_connector"],
  [connectionResumed, "resume_connector"],
  [connectionSuccessful, "connection_successful"],
  [transformationStarted, "transformation_start"],
  [transformationSucceeded, "transformation_succeeded"],
  [transformationFailed, "transformation_failed"],
];

test("fixture body has non-canonical whitespace", () => {
  assert.notEqual(JSON.stringify(JSON.parse(body("sync_end"))), body("sync_end"));
});

test("app declares the new webhook and poll triggers with output and sample", () => {
  const byKey = new Map(app.triggers.map((t) => [t.key, t]));
  assert.deepEqual(app.triggers.slice(0, 4).map((t) => t.key), [
    "new-connection",
    "sync-started",
    "sync-ended",
    "connection-failure",
  ]);
  for (const [t] of [...NAMED, [anyEvent, ""] as [TriggerDefinition, string]]) {
    assert.equal(byKey.get(t.key), t);
    assert.ok(t.output!.length > 0);
    assert.notEqual(t.sample, undefined);
    assert.equal(t.poll, undefined);
    assert.equal(typeof t.onSubscribe, "function");
    assert.equal(typeof t.onUnsubscribe, "function");
  }
  for (
    const k of ["new-destination", "new-transformation", "new-transformation-project", "new-user"]
  ) {
    assert.equal(typeof byKey.get(k)!.poll, "function", k);
    assert.equal(byKey.get(k)!.onSubscribe, undefined, k);
  }
});

for (const [t, ev] of NAMED) {
  const b = body(ev);
  const good = () => input(b, { [HDR]: sign(b) });

  test(`${t.key} (${ev}): valid signature over a non-canonical body -> one normalised event`, async () => {
    const [e] = evs(await run(t, good())) as Array<Record<string, unknown>>;
    assert.deepEqual(
      [e.event, e.connectorId, e.destinationGroupId, e.created],
      [ev, "mystified_presiding", "deck_enjoy", "2026-11-10T09:30:00.386Z"],
    );
  });

  test(`${t.key}: ONE flipped byte of the signature -> refused`, async () => {
    await assert.rejects(run(t, input(b, { [HDR]: flipLast(sign(b)) })), /does not match/);
  });

  test(`${t.key}: a flipped body byte, a re-serialised body, another secret -> refused`, async () => {
    await assert.rejects(
      run(t, input(b.replace("deck_enjoy", "deck_enjoz"), { [HDR]: sign(b) })),
      /does not match/,
    );
    await assert.rejects(
      run(t, input(b, { [HDR]: sign(JSON.stringify(JSON.parse(b))) })),
      /does not match/,
    );
    await assert.rejects(run(t, input(b, { [HDR]: sign(b, "other-secret") })), /does not match/);
  });

  test(`${t.key}: header missing or empty, rawBody absent -> refused`, async () => {
    await assert.rejects(run(t, input(b, {})), /header is missing/);
    await assert.rejects(run(t, input(b, { [HDR]: "" })), /header is missing/);
    await assert.rejects(run(t, input(undefined, { [HDR]: sign(b) })), /raw body/);
  });

  test(`${t.key}: an unset or empty secret is refused before any compare`, async () => {
    for (const secret of [null, ""]) {
      await assert.rejects(run(t, input(b, { [HDR]: sign(b) }, { secret })), /not configured/);
      await assert.rejects(run(t, input(b, {}, { secret })), /not configured/);
    }
  });

  test(`${t.key}: errors never echo the secret or the signature`, async () => {
    const bad = "ab".repeat(32);
    const msg = await run(t, input(b, { [HDR]: bad })).then(() => "", (e: Error) => e.message);
    assert.ok(msg.length > 0);
    for (const leak of [SECRET, bad]) assert.equal(msg.includes(leak), false);
  });

  test(`${t.key}: another event is acknowledged without an event`, async () => {
    const other = body(ev === "sync_end" ? "sync_start" : "sync_end");
    assert.deepEqual(evs(await run(t, input(other, { [HDR]: sign(other) }))), []);
  });

  test(`${t.key}: onSubscribe registers exactly this event (account path); a destination uses the group path`, async () => {
    const m = mockCtx([{ body: { data: { id: "wh_9" } } }]);
    const state = await t.onSubscribe!(
      { params: {}, subscriptionId: "sub_7", callbackUrl: CALLBACK, hostUrl: "" },
      m.ctx,
    ) as { webhookId: string; secret: string };
    assert.deepEqual([m.calls[0].method, m.calls[0].url], [
      "POST",
      "https://api.fivetran.com/v1/webhooks/account",
    ]);
    const sent = JSON.parse(m.calls[0].body!);
    assert.deepEqual(
      [sent.url, sent.events, sent.active],
      [CALLBACK, [ev], true],
    );
    assert.match(sent.secret, /^[0-9a-f]{64}$/);
    assert.deepEqual(state, { webhookId: "wh_9", secret: sent.secret });
    const g = mockCtx([{ body: { data: { id: "wh_10" } } }]);
    await t.onSubscribe!(
      {
        params: { groupId: " deck_enjoy " },
        subscriptionId: "s",
        callbackUrl: CALLBACK,
        hostUrl: "",
      },
      g.ctx,
    );
    assert.equal(g.calls[0].url, "https://api.fivetran.com/v1/webhooks/group/deck_enjoy");
  });

  test(`${t.key}: onUnsubscribe DELETEs the webhook; 404/410 are gone; 500 propagates`, async () => {
    const ok = mockCtx([{ body: { code: "Success" } }]);
    await t.onUnsubscribe!(
      { params: {}, state: { webhookId: "wh_9", secret: SECRET }, subscriptionId: "s" },
      ok.ctx,
    );
    assert.deepEqual([ok.calls[0].method, ok.calls[0].url], [
      "DELETE",
      "https://api.fivetran.com/v1/webhooks/wh_9",
    ]);
    for (const status of [404, 410]) {
      await t.onUnsubscribe!(
        { params: {}, state: { webhookId: "wh_9", secret: SECRET }, subscriptionId: "s" },
        mockCtx([{ status, body: { code: "NotFound", message: "gone" } }]).ctx,
      );
    }
    await assert.rejects(
      t.onUnsubscribe!(
        { params: {}, state: { webhookId: "wh_9", secret: SECRET }, subscriptionId: "s" },
        mockCtx([{ status: 500, body: { message: "boom" } }]).ctx,
      ),
      /Fivetran 500/,
    );
  });
}

// ---- Any Event ----------------------------------------------------------------------------

const ALL = [
  "sync_start",
  "sync_end",
  "transformation_start",
  "transformation_succeeded",
  "transformation_failed",
  "connection_successful",
  "connection_failure",
  "create_connector",
  "pause_connector",
  "resume_connector",
  "edit_connector",
  "delete_connector",
  "force_update_connector",
  "resync_connector",
  "resync_table",
];

test("any-event: onSubscribe with no filter registers all 15 documented events", async () => {
  const m = mockCtx([{ body: { data: { id: "wh_1" } } }]);
  const state = await anyEvent.onSubscribe!(
    { params: {}, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
    m.ctx,
  ) as { webhookId: string; secret: string };
  assert.equal(m.calls[0].url, "https://api.fivetran.com/v1/webhooks/account");
  const sent = JSON.parse(m.calls[0].body!);
  assert.deepEqual(sent.events, ALL);
  assert.match(sent.secret, /^[0-9a-f]{64}$/);
  assert.equal(state.secret, sent.secret);
});

test("any-event: onSubscribe with a list and a destination registers exactly that list on the group", async () => {
  const m = mockCtx([{ body: { data: { id: "wh_1" } } }]);
  await anyEvent.onSubscribe!(
    {
      params: { events: "sync_end, resync_table,sync_end", groupId: "deck_enjoy" },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    m.ctx,
  );
  assert.equal(m.calls[0].url, "https://api.fivetran.com/v1/webhooks/group/deck_enjoy");
  assert.deepEqual(JSON.parse(m.calls[0].body!).events, ["sync_end", "resync_table"]);
});

test("any-event: an unknown event name is refused at subscribe time with no request; no webhook id -> error", async () => {
  const m = mockCtx();
  await assert.rejects(
    anyEvent.onSubscribe!(
      {
        params: { events: "sync_end,sync_ended" },
        subscriptionId: "s",
        callbackUrl: CALLBACK,
        hostUrl: "",
      },
      m.ctx,
    ),
    /sync_ended/,
  );
  assert.equal(m.calls.length, 0);
  await assert.rejects(
    anyEvent.onSubscribe!(
      { params: {}, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
      mockCtx([{ body: { data: {} } }]).ctx,
    ),
    /id of the webhook/,
  );
});

test("any-event: onUnsubscribe DELETEs the webhook; 404/410 are gone; 500 propagates; none stored -> no call", async () => {
  const st = { webhookId: "wh_9", secret: SECRET };
  const ok = mockCtx([{ body: { code: "Success" } }]);
  await anyEvent.onUnsubscribe!({ params: {}, state: st, subscriptionId: "s" }, ok.ctx);
  assert.deepEqual([ok.calls[0].method, ok.calls[0].url], [
    "DELETE",
    "https://api.fivetran.com/v1/webhooks/wh_9",
  ]);
  for (const status of [404, 410]) {
    await anyEvent.onUnsubscribe!(
      { params: {}, state: st, subscriptionId: "s" },
      mockCtx([{ status, body: { message: "gone" } }]).ctx,
    );
  }
  await assert.rejects(
    anyEvent.onUnsubscribe!(
      { params: {}, state: st, subscriptionId: "s" },
      mockCtx([{ status: 500, body: { message: "boom" } }]).ctx,
    ),
    /Fivetran 500/,
  );
  const none = mockCtx();
  await anyEvent.onUnsubscribe!({ params: {}, state: {}, subscriptionId: "s" }, none.ctx);
  assert.equal(none.calls.length, 0);
});

test("any-event: every documented event reaches the run when no filter is set", async () => {
  const seen: string[] = [];
  for (const ev of ALL) {
    const b = body(ev);
    const [e] = evs(await run(anyEvent, input(b, { [HDR]: sign(b) }))) as Array<
      Record<string, unknown>
    >;
    seen.push(String(e.event));
  }
  assert.deepEqual(seen, ALL);
});

test("any-event: the events filter keeps only the listed events", async () => {
  const params = { events: "sync_end, resync_table" };
  const go = (ev: string) => {
    const b = body(ev);
    return run(anyEvent, input(b, { [HDR]: sign(b) }, { params }));
  };
  assert.deepEqual(evs(await go("sync_start")), []);
  assert.deepEqual(evs(await go("create_connector")), []);
  assert.equal(evs(await go("sync_end")).length, 1);
  assert.equal(evs(await go("resync_table")).length, 1);
});

test("any-event: ONE flipped byte of the signature, a flipped body byte, header missing, rawBody absent, empty secret -> refused", async () => {
  const b = body("sync_end");
  await assert.rejects(run(anyEvent, input(b, { [HDR]: flipLast(sign(b)) })), /does not match/);
  await assert.rejects(
    run(anyEvent, input(b.replace("deck_enjoy", "deck_enjoz"), { [HDR]: sign(b) })),
    /does not match/,
  );
  await assert.rejects(
    run(anyEvent, input(b, { [HDR]: sign(JSON.stringify(JSON.parse(b))) })),
    /does not match/,
  );
  await assert.rejects(run(anyEvent, input(b, {})), /header is missing/);
  await assert.rejects(run(anyEvent, input(undefined, { [HDR]: sign(b) })), /raw body/);
  for (const secret of [null, ""]) {
    await assert.rejects(run(anyEvent, input(b, {}, { secret })), /not configured/);
    await assert.rejects(run(anyEvent, input(b, { [HDR]: sign(b) }, { secret })), /not configured/);
  }
  await assert.rejects(
    run(anyEvent, input(b, { [HDR]: sign(b) }, { method: "GET" })),
    /with POST/,
  );
});
