import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const KEY = "test-webhook-auth-key-0123456789";
const URL_ = "https://api.example.test/triggers/webhooks/sub_9";
const API = "https://mandrillapp.com/api/1.0";
const find = (key: string) => app.triggers.find((t) => t.key === key)!;

const sign = (body: string, key = KEY) =>
  createHmac("sha1", key).update(URL_ + "mandrill_events" + body).digest("base64");
const formOf = (events: string) => new URLSearchParams({ mandrill_events: events }).toString();

function ingest(
  key: string,
  events: string | null,
  headers: Record<string, string>,
  state: Record<string, unknown> | null = { webhookId: 7, authKey: KEY, url: URL_ },
  params: Record<string, unknown> = {},
  method = "POST",
) {
  const rawBody = events === null ? null : formOf(events);
  return find(key).handleIngest!({
    raw: {
      method,
      path: "/",
      query: {},
      headers,
      body: rawBody === null ? null : Object.fromEntries(new URLSearchParams(rawBody)),
      ...(rawBody === null ? {} : { rawBody }),
    },
    params,
    state: state ?? {},
    subscriptionId: "sub_9",
  } as never, mockCtx().ctx);
}

const refuses = async (fn: () => Promise<unknown>) => {
  let threw = false;
  try {
    await fn();
  } catch {
    threw = true;
  }
  assert(threw, "expected the delivery to be refused");
};

// Non-canonical whitespace in the batch, so JSON.stringify(JSON.parse(x)) !== x.
const batch = (...items: string[]) => `[ ${items.join(" ,\n  ")} ]`;
const msgEvent = (event: string) =>
  `{ "event" : "${event}",  "ts": 1762770600, "_id":"m1", "msg": { "email":"ada@example.com", "state":"sent" } }`;

const messageTriggers: Array<[string, string[]]> = [
  ["email-sent", ["send"]],
  ["email-delivered", ["delivered"]],
  ["email-deferred", ["deferral"]],
  ["email-bounced", ["hard_bounce", "soft_bounce"]],
  ["email-opened", ["open"]],
  ["email-link-clicked", ["click"]],
  ["email-marked-spam", ["spam"]],
  ["email-unsubscribed", ["unsub"]],
  ["email-rejected", ["reject"]],
];

for (const [key, events] of messageTriggers) {
  test(`${key}: subscribes to ${events.join("+")} and verifies the signature`, async () => {
    const t = find(key);
    assert(t.output!.length > 0 && t.sample !== undefined);
    assertEquals(t.params, []);
    const m = mockCtx([{ body: { id: 7, auth_key: KEY } }]);
    const state = await t.onSubscribe!(
      { params: {}, callbackUrl: URL_, subscriptionId: "sub_9" } as never,
      m.ctx,
    );
    assertEquals(state, { webhookId: 7, authKey: KEY, url: URL_ });
    assertEquals(m.calls[0].method, "POST");
    assertEquals(m.calls[0].url, `${API}/webhooks/add.json`);
    assertEquals(JSON.parse(m.calls[0].body!), {
      url: URL_,
      description: "w6w trigger sub_9",
      events,
    });
    const body = batch(msgEvent(events[0]), msgEvent(events[0] === "open" ? "click" : "open"));
    assert(JSON.stringify(JSON.parse(body)) !== body);
    const good = { "x-mandrill-signature": sign(body) };
    const out = evs(await ingest(key, body, good)) as Array<{ event: string }>;
    assertEquals(out.map((e) => e.event), [events[0]]);
    // one flipped byte of the SIGNATURE itself
    const sig = sign(body);
    const flipped = sig.slice(0, 5) + (sig[5] === "A" ? "B" : "A") + sig.slice(6);
    await refuses(() => ingest(key, body, { "x-mandrill-signature": flipped }));
    // one flipped byte of the body
    await refuses(() => ingest(key, body.replace("ada", "adb"), good));
    await refuses(() => ingest(key, body, {}));
    await refuses(() => ingest(key, null, good));
    await refuses(() => ingest(key, body, good, { webhookId: 7, authKey: "", url: URL_ }));
    await refuses(() => ingest(key, body, good, null));
  });
}

test("email-bounced emits hard and soft bounces, nothing else", async () => {
  const body = batch(msgEvent("hard_bounce"), msgEvent("soft_bounce"), msgEvent("send"));
  const out = evs(await ingest("email-bounced", body, { "x-mandrill-signature": sign(body) }));
  assertEquals((out as Array<{ event: string }>).map((e) => e.event), [
    "hard_bounce",
    "soft_bounce",
  ]);
});

const syncItem = (type: string, action: string) =>
  `{ "type" : "${type}",  "action":"${action}", "ts": 1762770600, "reject": { "email":"ada@example.com", "reason":"hard-bounce" } }`;

const syncTriggers: Array<[string, string, string]> = [
  ["reject-denylist-changed", "blacklist", "denylist"],
  ["reject-allowlist-changed", "whitelist", "allowlist"],
];

for (const [key, list, label] of syncTriggers) {
  test(`${key}: subscribes to the ${list} sync event, filters actions, verifies the signature`, async () => {
    const t = find(key);
    assert(t.output!.length > 0 && t.sample !== undefined);
    const m = mockCtx([{ body: { id: 7, auth_key: KEY } }]);
    await t.onSubscribe!(
      { params: {}, callbackUrl: URL_, subscriptionId: "sub_9" } as never,
      m.ctx,
    );
    assertEquals(m.calls[0].url, `${API}/webhooks/add.json`);
    assertEquals(JSON.parse(m.calls[0].body!), {
      url: URL_,
      description: "w6w trigger sub_9",
      events: [list],
    });
    const other = list === "blacklist" ? "whitelist" : "blacklist";
    const body = batch(
      syncItem(list, "add"),
      syncItem(list, "remove"),
      syncItem(other, "add"),
      msgEvent("open"),
    );
    const good = { "x-mandrill-signature": sign(body) };
    const out = evs(await ingest(key, body, good)) as Array<Record<string, unknown>>;
    assertEquals(out.map((e) => [e.list, e.action, e.email, e.reason, e.timestamp]), [
      [label, "add", "ada@example.com", "hard-bounce", 1762770600],
      [label, "remove", "ada@example.com", "hard-bounce", 1762770600],
    ]);
    assertEquals(
      evs(await ingest(key, body, good, undefined, { actions: "remove" })).length,
      1,
    );
    const sig = sign(body);
    const flipped = sig.slice(0, 5) + (sig[5] === "A" ? "B" : "A") + sig.slice(6);
    await refuses(() => ingest(key, body, { "x-mandrill-signature": flipped }));
    await refuses(() => ingest(key, body, {}));
    await refuses(() => ingest(key, null, good));
    await refuses(() => ingest(key, body, good, { webhookId: 7, authKey: "", url: URL_ }));
  });
}

test("new-template: seed, one new template, idempotent, literal request", async () => {
  const t = find("new-template");
  assert(t.output!.length > 0 && t.sample !== undefined);
  const input = { params: {}, subscriptionId: "s" };
  const seed = mockCtx([{ body: [{ slug: "a", name: "A" }] }]);
  const seeded = await t.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(seed.calls[0].url, `${API}/templates/list.json`);
  assertEquals(JSON.parse(seed.calls[0].body!), {});
  const next = [{ slug: "a", name: "A" }, { slug: "b", name: "B" }];
  const run = () => t.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body: next }]).ctx);
  const a = await run();
  assertEquals(a.events.map((e) => (e as { key: string }).key), ["b"]);
  assertEquals(a, await run());
});
