import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import memberSubscribed from "../../triggers/member-subscribed.ts";
import anyEvent from "../../triggers/any-event.ts";
import { parseForm, parseSignatureHeader } from "../../lib/triggers.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_7";
const SECRET = "test-signing-secret";
const BASE = "https://us14.api.mailchimp.com/3.0/lists/aud_1/webhooks";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
// deno-lint-ignore no-explicit-any
type T = any;

/** A form body whose space is `%20` (URLSearchParams would re-encode it as `+`). */
const BODY =
  "type=subscribe&fired_at=2026-11-09%2021%3A35%3A57&data%5Bid%5D=8a25ff1d98&data%5Blist_id%5D=aud_1&data%5Bemail%5D=ada%40example.com&data%5Bmerges%5D%5BFNAME%5D=Ada&data%5Bmerges%5D%5BEMAIL%5D=ada%40example.com";
const UNSUB_BODY = BODY.replace("type=subscribe", "type=unsubscribe");

/** The expected signature header, computed here with node:crypto (independent of the app). */
function sig(body: string, ts: number, secret = SECRET): string {
  return `t=${ts},v1=${createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex")}`;
}
const nowSec = () => Math.floor(Date.now() / 1000);

function delivery(
  rawBody: string | undefined,
  headers: Record<string, string>,
  method = "POST",
): TriggerCall {
  const call: TriggerCall = {
    method,
    path: "/triggers/webhooks/sub_7",
    query: {},
    headers,
    body: rawBody === undefined ? null : Object.fromEntries(new URLSearchParams(rawBody)),
  };
  if (rawBody !== undefined) call.rawBody = rawBody;
  return call;
}
const signed = (body = BODY, ts = nowSec()) =>
  delivery(body, { "x-mailchimp-signature": sig(body, ts) });

function ingest(trigger: T, call: TriggerCall, state: Record<string, unknown>) {
  return trigger.handleIngest(
    { raw: call, params: { listId: "aud_1" }, state, subscriptionId: "sub_7" },
    mockCtx().ctx,
  );
}
const STATE = {
  webhookId: "wh_1",
  listId: "aud_1",
  secret: SECRET,
  events: ["subscribe"],
};

test("fixture: re-encoding the body changes its bytes, so a re-serialised signature must fail", () => {
  assert.notEqual(new URLSearchParams(BODY).toString(), BODY);
});

test("the app declares ten triggers (seven webhook, three poll), each with output and a sample", () => {
  const triggers = app.triggers ?? [];
  assert.equal(triggers.length, 10);
  assert.equal(triggers.filter((t) => typeof t.handleIngest === "function").length, 7);
  assert.equal(triggers.filter((t) => typeof t.poll === "function").length, 3);
  for (const t of triggers) {
    assert.ok((t.output?.length ?? 0) > 0, t.key);
    assert.ok(t.sample !== undefined, t.key);
    if (t.handleIngest) {
      assert.equal(typeof t.onSubscribe, "function", t.key);
      assert.equal(typeof t.onUnsubscribe, "function", t.key);
      assert.equal(typeof t.poll, "undefined", t.key);
    }
  }
});

test("handleIngest: a valid signature over the exact bytes yields the normalized event", async () => {
  const out = evs(await ingest(memberSubscribed, signed(), STATE));
  assert.deepEqual(out, [{
    type: "subscribe",
    firedAt: "2026-11-09 21:35:57",
    listId: "aud_1",
    id: "8a25ff1d98",
    email: "ada@example.com",
    data: {
      id: "8a25ff1d98",
      list_id: "aud_1",
      email: "ada@example.com",
      merges: { FNAME: "Ada", EMAIL: "ada@example.com" },
    },
  }]);
});

/** Every signed trigger, with the Mailchimp event it is wired to written out as a literal. */
const SIGNED: Array<[key: string, event: string]> = [
  ["member-subscribed", "subscribe"],
  ["member-unsubscribed", "unsubscribe"],
  ["member-updated", "profile"],
  ["member-cleaned", "cleaned"],
  ["email-changed", "upemail"],
  ["campaign-status", "campaign"],
  ["any-event", "cleaned"],
];
const triggerByKey = (key: string): T => {
  const t = (app.triggers ?? []).find((x) => x.key === key);
  assert.ok(t, key);
  return t;
};
const bodyFor = (event: string) => BODY.replace("type=subscribe", `type=${event}`);
const stateFor = (event: string) => ({ ...STATE, events: [event] });
/** `hex` with the character at `i` changed. */
const flipAt = (hex: string, i: number) =>
  hex.slice(0, i) + (hex[i] === "0" ? "1" : "0") + hex.slice(i + 1);
const header = (v1: string, ts: number) => `t=${ts},v1=${v1}`;

test("the table names every signed trigger the app declares, once", () => {
  const declared = (app.triggers ?? []).filter((t) => typeof t.handleIngest === "function")
    .map((t) => t.key).sort();
  assert.deepEqual(SIGNED.map(([k]) => k).sort(), declared);
});

for (const [key, event] of SIGNED) {
  const trigger = triggerByKey(key);
  const body = bodyFor(event);
  const state = stateFor(event);
  const other = bodyFor(event === "subscribe" ? "unsubscribe" : "subscribe");

  test(`${key}: a signed ${event} delivery yields one run of that event; another event yields none`, async () => {
    const out = evs(await ingest(trigger, signed(body), state)) as Array<{ type: string }>;
    assert.deepEqual(out.map((e) => e.type), [event]);
    assert.deepEqual(evs(await ingest(trigger, signed(other), state)), []);
  });

  test(`${key}: a flipped byte of the SIGNATURE (first, middle and last position) throws`, async () => {
    const ts = nowSec();
    const good = createHmac("sha256", SECRET).update(`${ts}.${body}`).digest("hex");
    assert.equal(good.length, 64);
    for (const at of [0, 31, 63]) {
      const call = delivery(body, { "x-mailchimp-signature": header(flipAt(good, at), ts) });
      await assert.rejects(async () => await ingest(trigger, call, state), undefined, `pos ${at}`);
    }
    // control: the unflipped signature is accepted
    assert.equal(
      evs(
        await ingest(trigger, delivery(body, { "x-mailchimp-signature": header(good, ts) }), state),
      )
        .length,
      1,
    );
  });

  test(`${key}: a flipped byte in the body, or a re-serialised body, throws`, async () => {
    const ts = nowSec();
    const tampered = delivery(body.replace("Ada", "Adb"), {
      "x-mailchimp-signature": sig(body, ts),
    });
    await assert.rejects(async () => await ingest(trigger, tampered, state));
    const reencoded = new URLSearchParams(body).toString();
    assert.notEqual(reencoded, body);
    const call = delivery(body, { "x-mailchimp-signature": sig(reencoded, ts) });
    await assert.rejects(async () => await ingest(trigger, call, state));
  });

  test(`${key}: a missing or malformed signature header throws`, async () => {
    const ts = nowSec();
    for (
      const headers of [
        {},
        { "x-mailchimp-signature": "" },
        { "x-mailchimp-signature": "junk" },
        { "x-mailchimp-signature": `t=${ts},v1=abc` },
      ]
    ) {
      await assert.rejects(async () => await ingest(trigger, delivery(body, headers), state));
    }
  });

  test(`${key}: an absent rawBody throws (never falls back to the parsed body)`, async () => {
    const call = signed(body);
    delete call.rawBody;
    await assert.rejects(async () => await ingest(trigger, call, state), /raw body/);
  });

  test(`${key}: a stale or future timestamp throws even with a correct signature`, async () => {
    const now = nowSec();
    for (const ts of [now - 305, now + 305]) {
      await assert.rejects(
        async () => await ingest(trigger, signed(body, ts), state),
        /tolerance/,
      );
    }
    assert.equal(evs(await ingest(trigger, signed(body, now - 200), state)).length, 1);
  });

  test(`${key}: an unset or empty secret refuses before any compare`, async () => {
    for (const secret of [undefined, ""]) {
      for (
        const call of [delivery(body, {}), delivery(body, { "x-mailchimp-signature": "t=1,v1=" })]
      ) {
        await assert.rejects(
          async () => await ingest(trigger, call, { ...state, secret }),
          /secret/,
        );
      }
    }
  });

  test(`${key}: a non-POST delivery throws`, async () => {
    for (const method of ["PUT", "GET"]) {
      const call = delivery(body, { "x-mailchimp-signature": sig(body, nowSec()) }, method);
      await assert.rejects(async () => await ingest(trigger, call, state), undefined, method);
    }
  });
}

test("any-event: only the events on record for the subscription pass; none on record passes all", async () => {
  const only = { ...STATE, events: ["unsubscribe"] };
  assert.deepEqual(evs(await ingest(anyEvent, signed(BODY), only)), []);
  const out = evs(await ingest(anyEvent, signed(UNSUB_BODY), only)) as Array<{ type: string }>;
  assert.deepEqual(out.map((e) => e.type), ["unsubscribe"]);
  const all = { ...STATE, events: [] };
  assert.equal(evs(await ingest(anyEvent, signed(BODY), all)).length, 1);
});

test("parseForm nests bracketed keys and drops prototype-reaching keys", () => {
  assert.deepEqual(parseForm("a=1&b%5Bc%5D%5Bd%5D=2&b%5Be%5D=3"), {
    a: "1",
    b: { c: { d: "2" }, e: "3" },
  });
  const out = parseForm("__proto__%5Bx%5D=1&data%5Bconstructor%5D%5Bprototype%5D%5By%5D=2&ok=1");
  assert.deepEqual(out, { ok: "1" });
  assert.equal(({} as Record<string, unknown>).x, undefined);
});

test("parseSignatureHeader reads t and a 64-hex v1 only", () => {
  const hex = "a".repeat(64);
  assert.deepEqual(parseSignatureHeader(`t=1718000000,v1=${hex}`), { t: "1718000000", v1: hex });
  assert.equal(parseSignatureHeader(`t=1718000000,v1=${hex.slice(1)}`), null);
  assert.equal(parseSignatureHeader(`v1=${hex}`), null);
});

// ------------------------------------------------------------------ lifecycle

const hook = (over: Record<string, unknown> = {}) => ({
  params: { listId: "aud_1" },
  callbackUrl: CALLBACK,
  subscriptionId: "sub_7",
  ...over,
});

test("onSubscribe: lists the audience's webhooks, then creates one with the literal request", async () => {
  const { ctx, calls } = mockCtx([
    { body: { webhooks: [{ id: "other", url: "https://elsewhere.test/hook" }] } },
    { body: { id: "wh_9", signing_secret: SECRET, signing_enabled: true } },
  ]);
  const state = await (memberSubscribed as T).onSubscribe(hook(), ctx);
  assert.deepEqual(state, {
    webhookId: "wh_9",
    listId: "aud_1",
    secret: SECRET,
    events: ["subscribe"],
  });
  assert.deepEqual(calls.map((c) => [c.method, c.url, c.body && JSON.parse(c.body)]), [
    ["GET", `${BASE}?count=1000`, null],
    ["POST", BASE, {
      url: CALLBACK,
      events: { subscribe: true },
      sources: { user: true, admin: true, api: false },
    }],
  ]);
});

test("onSubscribe: a leftover webhook on the same URL is deleted first; apiChanges adds the api source", async () => {
  const { ctx, calls } = mockCtx([
    { body: { webhooks: [{ id: "old_1", url: CALLBACK }] } },
    { status: 204 },
    { body: { id: "wh_9", signing_secret: SECRET } },
  ]);
  await (memberSubscribed as T).onSubscribe(
    hook({ params: { listId: "aud_1", apiChanges: true } }),
    ctx,
  );
  assert.deepEqual(calls.map((c) => [c.method, c.url]), [
    ["GET", `${BASE}?count=1000`],
    ["DELETE", `${BASE}/old_1`],
    ["POST", BASE],
  ]);
  assert.deepEqual(JSON.parse(calls[2].body!).sources, { user: true, admin: true, api: true });
});

test("onSubscribe: a webhook created without a signing secret is deleted again and refused", async () => {
  const { ctx, calls } = mockCtx([
    { body: { webhooks: [] } },
    { body: { id: "wh_9" } },
    { status: 204 },
  ]);
  await assert.rejects(
    async () => await (memberSubscribed as T).onSubscribe(hook(), ctx),
    /signing secret/,
  );
  assert.deepEqual(calls.map((c) => [c.method, c.url]).slice(2), [["DELETE", `${BASE}/wh_9`]]);
});

test("onSubscribe: no audience is refused before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assert.rejects(
    async () => await (memberSubscribed as T).onSubscribe(hook({ params: {} }), ctx),
    /audience/,
  );
  assert.equal(calls.length, 0);
});

test("any-event onSubscribe: the events param is the subscription; empty is the six audience events", async () => {
  const one = mockCtx([{ body: { webhooks: [] } }, { body: { id: "w", signing_secret: SECRET } }]);
  const state = await (anyEvent as T).onSubscribe(
    hook({ params: { listId: "aud_1", events: " unsubscribe , sms_subscribe " } }),
    one.ctx,
  );
  assert.deepEqual(state.events, ["unsubscribe", "sms_subscribe"]);
  assert.deepEqual(JSON.parse(one.calls[1].body!).events, {
    unsubscribe: true,
    sms_subscribe: true,
  });

  const all = mockCtx([{ body: { webhooks: [] } }, { body: { id: "w", signing_secret: SECRET } }]);
  await (anyEvent as T).onSubscribe(hook(), all.ctx);
  assert.deepEqual(JSON.parse(all.calls[1].body!).events, {
    subscribe: true,
    unsubscribe: true,
    profile: true,
    cleaned: true,
    upemail: true,
    campaign: true,
  });

  const bad = mockCtx();
  await assert.rejects(
    async () =>
      await (anyEvent as T).onSubscribe(
        hook({ params: { listId: "aud_1", events: "nope" } }),
        bad.ctx,
      ),
    /Unknown Mailchimp event/,
  );
  assert.equal(bad.calls.length, 0);
});

test("onUnsubscribe: deletes the webhook; one already gone is fine; other errors propagate", async () => {
  const ok = mockCtx([{ status: 204 }]);
  await (memberSubscribed as T).onUnsubscribe(
    { params: {}, state: STATE, subscriptionId: "s" },
    ok.ctx,
  );
  assert.deepEqual(ok.calls.map((c) => [c.method, c.url]), [["DELETE", `${BASE}/wh_1`]]);

  const gone = mockCtx([{ status: 404, body: { title: "Resource Not Found" } }]);
  await (memberSubscribed as T).onUnsubscribe(
    { params: {}, state: STATE, subscriptionId: "s" },
    gone.ctx,
  );

  const broken = mockCtx([{ status: 500, body: "boom" }]);
  await assert.rejects(
    async () =>
      await (memberSubscribed as T).onUnsubscribe(
        { params: {}, state: STATE, subscriptionId: "s" },
        broken.ctx,
      ),
    /500/,
  );
  const none = mockCtx();
  await (memberSubscribed as T).onUnsubscribe(
    { params: {}, state: undefined, subscriptionId: "s" },
    none.ctx,
  );
  assert.equal(none.calls.length, 0);
});
