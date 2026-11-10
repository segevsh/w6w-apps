import assert from "node:assert/strict";
import test from "node:test";
import app from "../../index.ts";
import { mockCtx } from "../_helpers.ts";

const CALLBACK = "https://w6w.example/triggers/webhooks/sub_123";
const PASSWORD = "test-secret";
/** Computed with node's Buffer, independent of the app's btoa. */
const basic = (password: string) => "Basic " + Buffer.from(`w6w:${password}`).toString("base64");

// deno-lint-ignore no-explicit-any
type Any = any;
const trigger = (key: string): Any => {
  const t = app.triggers.find((x) => x.key === key);
  assert.ok(t, `trigger ${key} missing`);
  return t;
};

/** key -> [action, object, shape] — literal, from the Pipedrive webhook v2 guide. */
const NAMED: Record<string, [string, string, "record" | "change"]> = {
  "new-person": ["create", "person", "record"],
  "new-organization": ["create", "organization", "record"],
  "new-activity": ["create", "activity", "record"],
  "new-note": ["create", "note", "record"],
  "new-lead": ["create", "lead", "record"],
  "deal-updated": ["change", "deal", "change"],
  "deal-deleted": ["delete", "deal", "change"],
  "person-updated": ["change", "person", "change"],
  "person-deleted": ["delete", "person", "change"],
  "organization-updated": ["change", "organization", "change"],
  "organization-deleted": ["delete", "organization", "change"],
};

const delivery = (action: string, entity: string, extra: Record<string, unknown> = {}) => ({
  meta: {
    action,
    entity,
    entity_id: "42",
    id: "evt-1",
    timestamp: "2026-11-10T09:30:00.000Z",
    version: "2.0",
    ...extra,
  },
  data: action === "delete" ? null : { id: "42", name: "Current" },
  previous: action === "create" ? null : { name: "Before" },
});

const call = (
  body: unknown,
  over: { headers?: Record<string, string>; method?: string } = {},
) => ({
  method: over.method ?? "POST",
  path: "/",
  query: {},
  headers: over.headers ?? { authorization: basic(PASSWORD) },
  body,
});

const STATE = (events: Array<{ action: string; object: string }>, password = PASSWORD) => ({
  webhookId: "9",
  webhookIds: ["9"],
  httpAuthPassword: password,
  events,
});

const ingest = async (t: Any, raw: unknown, state: unknown) =>
  await t.handleIngest({ raw, params: {}, state, subscriptionId: "sub-1" }, mockCtx().ctx);

for (const [key, [action, object, shape]] of Object.entries(NAMED)) {
  const t = trigger(key);
  const state = STATE([{ action, object }]);

  test(`${key}: a delivery with the registered credentials yields the event`, async () => {
    const out = await ingest(t, call(delivery(action, object)), state);
    if (shape === "record") {
      assert.deepEqual(out, [{ id: "42", name: "Current" }]);
    } else {
      assert.deepEqual(out, [{
        action,
        entity: object,
        entityId: "42",
        timestamp: "2026-11-10T09:30:00.000Z",
        eventId: "evt-1",
        mergedFromId: null,
        mergedToId: null,
        current: action === "delete" ? null : { id: "42", name: "Current" },
        previous: { name: "Before" },
      }]);
    }
  });

  test(`${key}: one flipped byte of the credential (first, middle, last) is refused`, async () => {
    const good = basic(PASSWORD);
    for (const at of [6, Math.floor((6 + good.length) / 2), good.length - 1]) {
      const bad = good.slice(0, at) + (good[at] === "A" ? "B" : "A") + good.slice(at + 1);
      assert.notEqual(bad, good);
      assert.equal(bad.length, good.length);
      await assert.rejects(
        () => ingest(t, call(delivery(action, object), { headers: { authorization: bad } }), state),
        /refused/,
      );
    }
  });

  test(`${key}: a missing Authorization header is refused`, async () => {
    await assert.rejects(
      () => ingest(t, call(delivery(action, object), { headers: {} }), state),
      /refused/,
    );
  });

  test(`${key}: an unset or empty password refuses before any compare`, async () => {
    for (const st of [undefined, null, {}, STATE([{ action, object }], "")]) {
      for (const headers of [{}, { authorization: "" }, { authorization: basic(PASSWORD) }]) {
        await assert.rejects(
          () => ingest(t, call(delivery(action, object), { headers }), st),
          /secret/,
        );
      }
    }
  });

  test(`${key}: a non-POST call is refused; another event is acknowledged with no run`, async () => {
    await assert.rejects(
      () => ingest(t, call(delivery(action, object), { method: "GET" }), state),
      /POST/,
    );
    const other = action === "create" ? "delete" : "create";
    assert.deepEqual(await ingest(t, call(delivery(other, object)), state), []);
    assert.deepEqual(await ingest(t, call(delivery(action, "product")), state), []);
  });

  test(`${key}: onSubscribe registers exactly ${action}.${object} with Basic auth, onUnsubscribe deletes`, async () => {
    const { ctx, calls } = mockCtx([
      { body: { success: true, data: [] } },
      { body: { success: true, data: { id: 9 } } },
      { status: 200, body: { success: true } },
    ]);
    const st = await t.onSubscribe({ params: {}, callbackUrl: CALLBACK, subscriptionId: "s" }, ctx);
    assert.equal(calls[1].method, "POST");
    assert.equal(calls[1].url, "https://api.pipedrive.com/v1/webhooks");
    const sent = JSON.parse(calls[1].body!);
    assert.equal(typeof sent.http_auth_password, "string");
    assert.ok(sent.http_auth_password.length >= 32);
    assert.deepEqual(sent, {
      subscription_url: CALLBACK,
      event_action: action,
      event_object: object,
      name: `w6w ${key} ${action}.${object}`,
      version: "2.0",
      http_auth_user: "w6w",
      http_auth_password: sent.http_auth_password,
    });
    assert.deepEqual(st, {
      webhookId: "9",
      webhookIds: ["9"],
      httpAuthPassword: sent.http_auth_password,
      events: [{ action, object }],
    });
    await t.onUnsubscribe({ params: {}, state: st, subscriptionId: "s" }, ctx);
    assert.equal(calls[2].method, "DELETE");
    assert.equal(calls[2].url, "https://api.pipedrive.com/v1/webhooks/9");
  });

  test(`${key}: declares output and sample and no poll`, () => {
    assert.ok(t.output.length > 0);
    assert.notEqual(t.sample, undefined);
    assert.equal(t.poll, undefined);
    assert.deepEqual(t.params, []);
  });
}

// ---- the per-subscription password is random ----

test("onSubscribe: two subscriptions get different random passwords (64 hex), one per subscription", async () => {
  const register = async (t: Any, responses: unknown[]) => {
    const { ctx, calls } = mockCtx(responses as Parameters<typeof mockCtx>[0]);
    await t.onSubscribe({ params: {}, callbackUrl: CALLBACK, subscriptionId: "s" }, ctx);
    return calls.filter((c) => c.method === "POST").map((c) =>
      JSON.parse(c.body!).http_auth_password
    );
  };
  const one = () => [
    { body: { success: true, data: [] } },
    { body: { success: true, data: { id: 9 } } },
  ];
  const a = await register(trigger("new-person"), one());
  const b = await register(trigger("new-person"), one());
  assert.equal(a.length, 1);
  assert.equal(b.length, 1);
  for (const p of [a[0], b[0]]) {
    assert.ok(p.length >= 32);
    assert.match(p, /^[0-9a-f]{64}$/);
  }
  assert.notEqual(a[0], b[0]);
});

// ---- Any event ----

const any = trigger("any-event");

test("any-event: empty events registers one *.* webhook", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, data: [] } },
    { body: { success: true, data: { id: 5 } } },
  ]);
  const st = await any.onSubscribe({ params: {}, callbackUrl: CALLBACK, subscriptionId: "s" }, ctx);
  const sent = JSON.parse(calls[1].body!);
  assert.equal(sent.event_action, "*");
  assert.equal(sent.event_object, "*");
  assert.deepEqual(st.events, [{ action: "*", object: "*" }]);
});

test("any-event: each listed pair is registered; a failure removes the ones already created", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, data: [] } },
    { body: { success: true, data: { id: 11 } } },
    { body: { success: true, data: { id: 12 } } },
    { status: 400, statusText: "Bad Request", body: { success: false } },
    { body: { success: true } },
    { body: { success: true } },
  ]);
  await assert.rejects(
    () =>
      any.onSubscribe({
        params: { events: "change.deal, delete.person, create.product" },
        callbackUrl: CALLBACK,
        subscriptionId: "s",
      }, ctx),
    /400/,
  );
  assert.deepEqual(
    calls.slice(1, 4).map((c) => {
      const b = JSON.parse(c.body!);
      return `${b.event_action}.${b.event_object}`;
    }),
    ["change.deal", "delete.person", "create.product"],
  );
  assert.deepEqual(calls.slice(4).map((c) => `${c.method} ${c.url}`), [
    "DELETE https://api.pipedrive.com/v1/webhooks/11",
    "DELETE https://api.pipedrive.com/v1/webhooks/12",
  ]);
});

test("any-event: a malformed events list is refused before any request", async () => {
  for (const events of ["deal", "update.deal", "change.Deal"]) {
    const { ctx, calls } = mockCtx();
    await assert.rejects(
      () =>
        any.onSubscribe({ params: { events }, callbackUrl: CALLBACK, subscriptionId: "s" }, ctx),
      /not a Pipedrive event/,
    );
    assert.equal(calls.length, 0);
  }
});

test("any-event: emits only registered pairs, with merge ids, and checks the credential", async () => {
  const state = STATE([{ action: "change", object: "person" }, { action: "delete", object: "*" }]);
  const merged = delivery("change", "person", { merged_from_id: "99" });
  const out = await ingest(any, call(merged), state);
  assert.equal(out.length, 1);
  assert.equal(out[0].mergedFromId, "99");
  assert.equal(out[0].entity, "person");
  assert.equal(
    (await ingest(any, call(delivery("delete", "deal", { merged_to_id: "7" })), state))[0]
      .mergedToId,
    "7",
  );
  assert.deepEqual(await ingest(any, call(delivery("create", "person")), state), []);
  const bad = basic("test-secreT");
  await assert.rejects(
    () => ingest(any, call(merged, { headers: { authorization: bad } }), state),
    /refused/,
  );
  await assert.rejects(() => ingest(any, call(merged, { headers: {} }), state), /refused/);
  await assert.rejects(() => ingest(any, call(merged), STATE([], "")), /secret/);
});

test("any-event: declares an optional events string, output and sample", () => {
  assert.deepEqual(any.params.map((p: Any) => [p.key, p.type, p.required === true]), [
    ["events", "string", false],
  ]);
  assert.ok(any.output.length > 0);
  assert.notEqual(any.sample, undefined);
});
