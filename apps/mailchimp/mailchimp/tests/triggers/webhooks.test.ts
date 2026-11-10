import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import memberSubscribed from "../../triggers/member-subscribed.ts";
import memberUnsubscribed from "../../triggers/member-unsubscribed.ts";
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

test("handleIngest: a flipped byte in the SIGNATURE throws", async () => {
  const ts = nowSec();
  const good = sig(BODY, ts);
  const at = good.length - 1;
  const bad = good.slice(0, at) + (good[at] === "0" ? "1" : "0");
  await assert.rejects(async () =>
    await ingest(memberSubscribed, delivery(BODY, { "x-mailchimp-signature": bad }), STATE)
  );
});

test("handleIngest: a flipped byte in the body throws", async () => {
  const ts = nowSec();
  const call = delivery(BODY.replace("Ada", "Adb"), { "x-mailchimp-signature": sig(BODY, ts) });
  await assert.rejects(async () => await ingest(memberSubscribed, call, STATE));
});

test("handleIngest: a signature made over the re-serialised form is refused", async () => {
  const ts = nowSec();
  const reencoded = new URLSearchParams(BODY).toString();
  const call = delivery(BODY, { "x-mailchimp-signature": sig(reencoded, ts) });
  await assert.rejects(async () => await ingest(memberSubscribed, call, STATE));
});

test("handleIngest: a missing or malformed signature header throws", async () => {
  for (
    const headers of [{}, { "x-mailchimp-signature": "" }, { "x-mailchimp-signature": "junk" }]
  ) {
    await assert.rejects(async () =>
      await ingest(memberSubscribed, delivery(BODY, headers), STATE)
    );
  }
  const ts = nowSec();
  await assert.rejects(async () =>
    await ingest(
      memberSubscribed,
      delivery(BODY, { "x-mailchimp-signature": `t=${ts},v1=abc` }),
      STATE,
    )
  );
});

test("handleIngest: an absent rawBody throws (never falls back to the parsed body)", async () => {
  const call = signed();
  delete call.rawBody;
  await assert.rejects(async () => await ingest(memberSubscribed, call, STATE), /raw body/);
});

test("handleIngest: a stale or future timestamp throws even with a correct signature", async () => {
  const now = nowSec();
  for (const ts of [now - 305, now + 305]) {
    await assert.rejects(
      async () => await ingest(memberSubscribed, signed(BODY, ts), STATE),
      /tolerance/,
    );
  }
  assert.equal(evs(await ingest(memberSubscribed, signed(BODY, now - 200), STATE)).length, 1);
});

test("handleIngest: an unset or empty secret refuses before any compare", async () => {
  for (const secret of [undefined, ""]) {
    for (
      const call of [delivery(BODY, {}), delivery(BODY, { "x-mailchimp-signature": "t=1,v1=" })]
    ) {
      await assert.rejects(
        async () => await ingest(memberSubscribed, call, { ...STATE, secret }),
        /secret/,
      );
    }
  }
});

test("handleIngest: a non-POST delivery throws", async () => {
  const call = delivery(BODY, { "x-mailchimp-signature": sig(BODY, nowSec()) }, "PUT");
  await assert.rejects(async () => await ingest(memberSubscribed, call, STATE));
});

test("handleIngest: an event the trigger does not listen for is acknowledged without a run", async () => {
  assert.deepEqual(evs(await ingest(memberSubscribed, signed(UNSUB_BODY), STATE)), []);
  assert.equal(
    evs(
      await ingest(memberUnsubscribed, signed(UNSUB_BODY), {
        ...STATE,
        events: ["unsubscribe"],
      }),
    ).length,
    1,
  );
});

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
