import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import { v3Uri } from "../../lib/triggers.ts";

const SECRET = "test-secret";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// [trigger key, HubSpot event type it fires on]
const NAMED: Array<[string, string]> = [
  ["contact-created", "contact.creation"],
  ["contact-updated", "contact.propertyChange"],
  ["contact-deleted", "contact.deletion"],
  ["company-created", "company.creation"],
  ["company-updated", "company.propertyChange"],
  ["company-deleted", "company.deletion"],
  ["deal-created", "deal.creation"],
  ["deal-updated", "deal.propertyChange"],
  ["deal-deleted", "deal.deletion"],
  ["ticket-created", "ticket.creation"],
  ["ticket-updated", "ticket.propertyChange"],
  ["ticket-deleted", "ticket.deletion"],
];

const notification = (eventType: string, extra: Record<string, unknown> = {}) => ({
  objectId: 1246978,
  eventId: 3816279480,
  subscriptionId: 22,
  portalId: 33,
  appId: 1160452,
  occurredAt: 1462216307945,
  eventType,
  attemptNumber: 0,
  changeSource: "CRM",
  ...extra,
});

// A batch, as HubSpot sends it, with spacing JSON.stringify would not produce.
const bodyOf = (...ns: unknown[]) => `[ ${ns.map((n) => JSON.stringify(n)).join(",  ")} ]`;

const trigger = (key: string) => app.triggers.find((t) => t.key === key)!;
const now = () => Date.now();

/** Expected v3 signature, from node:crypto: base64 HMAC-SHA256(method + uri + body + timestamp). */
function sigV3(body: string, ts: string, uri = CALLBACK, method = "POST", secret = SECRET) {
  return createHmac("sha256", secret).update(method + uri + body + ts).digest("base64");
}

/** Expected v1 signature, from node:crypto: hex SHA-256(secret + body). */
function sigV1(body: string, secret = SECRET) {
  return createHash("sha256").update(secret + body).digest("hex");
}

function call(rawBody: string | undefined, headers: Record<string, string>): TriggerCall {
  return {
    method: "POST",
    path: "/triggers/webhooks/sub_1",
    query: {},
    headers,
    body: rawBody === undefined ? null : JSON.parse(rawBody),
    ...(rawBody === undefined ? {} : { rawBody }),
  };
}

function v3Call(body: string, ts = String(now())) {
  return call(body, {
    "x-hubspot-signature-v3": sigV3(body, ts),
    "x-hubspot-request-timestamp": ts,
  });
}

function v1Call(body: string) {
  return call(body, { "x-hubspot-signature": sigV1(body), "x-hubspot-signature-version": "v1" });
}

function ingest(
  key: string,
  raw: TriggerCall,
  params: Record<string, unknown> = { signingSecret: SECRET },
  state: Record<string, unknown> = { callbackUrl: CALLBACK },
) {
  return trigger(key).handleIngest!(
    { raw, params, state, subscriptionId: "sub_1" } as never,
    mockCtx().ctx,
  ) as Promise<Array<Record<string, unknown>>>;
}

test("fixtures: the body is not canonical JSON, and the signatures differ per scheme", () => {
  const body = bodyOf(notification("contact.creation"));
  assert.notEqual(JSON.stringify(JSON.parse(body)), body);
  assert.notEqual(sigV3(body, "1"), sigV1(body));
});

test("every webhook trigger is wired in index.ts with output, sample and a secret param", () => {
  const keys = app.triggers.map((t) => t.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const key of [...NAMED.map(([k]) => k), "any-event"]) {
    assert.ok(keys.includes(key), key);
    const t = trigger(key);
    assert.ok(t.output.length > 0, key);
    assert.notEqual(t.sample, undefined, key);
    assert.equal(t.params!.find((p) => p.key === "signingSecret")!.type, "secret", key);
    assert.equal(typeof t.poll, "undefined", key);
  }
});

for (const [key, type] of NAMED) {
  test(`${key}: valid v3 and v1 deliveries yield only ${type} from a mixed batch`, async () => {
    const body = bodyOf(
      notification(type, { objectId: 11, propertyName: "lifecyclestage", propertyValue: "lead" }),
      notification("conversation.newMessage", { objectId: 12 }),
      notification(type, { objectId: 13 }),
    );
    for (const raw of [v3Call(body), v1Call(body)]) {
      const out = await ingest(key, raw);
      assert.deepEqual(out.map((e) => e.objectId), ["11", "13"]);
      assert.equal(out[0].eventType, type);
      assert.equal(out[0].portalId, "33");
      assert.equal(out[0].eventId, "3816279480");
    }
  });

  test(`${key}: flipped byte, missing headers, absent rawBody, stale timestamp, unset secret -> refused`, async () => {
    const body = bodyOf(notification(type));
    const ts = String(now());
    const good = v3Call(body, ts);
    const sig = good.headers["x-hubspot-signature-v3"];
    const flipped = sig.slice(0, -2) + (sig.slice(-2) === "AA" ? "BB" : "AA");
    await assert.rejects(
      ingest(key, call(body, { ...good.headers, "x-hubspot-signature-v3": flipped })),
      /signature does not match/,
    );
    const v1 = v1Call(body).headers["x-hubspot-signature"];
    await assert.rejects(
      ingest(
        key,
        call(body, {
          "x-hubspot-signature": v1.slice(0, -1) + (v1.endsWith("0") ? "1" : "0"),
          "x-hubspot-signature-version": "v1",
        }),
      ),
      /signature does not match/,
    );
    await assert.rejects(ingest(key, call(body, {})), /signature headers are missing/);
    await assert.rejects(ingest(key, call(undefined, good.headers)), /raw body/);
    await assert.rejects(
      ingest(key, v3Call(body, String(now() - 6 * 60 * 1000))),
      /outside the allowed window/,
    );
    for (const secret of [undefined, ""]) {
      await assert.rejects(ingest(key, good, { signingSecret: secret }), /secret/);
      await assert.rejects(ingest(key, call(body, {}), { signingSecret: secret }), /secret/);
    }
  });
}

test("v3: the edge of the window passes, a future-dated timestamp does not", async () => {
  const body = bodyOf(notification("contact.creation"));
  assert.equal((await ingest("contact-created", v3Call(body, String(now() - 290_000)))).length, 1);
  await assert.rejects(
    ingest("contact-created", v3Call(body, String(now() + 6 * 60 * 1000))),
    /outside the allowed window/,
  );
});

test("v3: a present v3 header is the only accepted proof; a valid v1 beside a bad v3 is refused", async () => {
  const body = bodyOf(notification("contact.creation"));
  const ts = String(now());
  const raw = call(body, {
    "x-hubspot-signature-v3": "AAAA",
    "x-hubspot-request-timestamp": ts,
    "x-hubspot-signature": sigV1(body),
    "x-hubspot-signature-version": "v1",
  });
  await assert.rejects(ingest("contact-created", raw), /signature does not match/);
  const empty = call(body, {
    "x-hubspot-signature-v3": "",
    "x-hubspot-signature": sigV1(body),
    "x-hubspot-signature-version": "v1",
  });
  await assert.rejects(ingest("contact-created", empty), /v3 signature headers are missing/);
  const noTs = call(body, { "x-hubspot-signature-v3": sigV3(body, ts) });
  await assert.rejects(ingest("contact-created", noTs), /v3 signature headers are missing/);
});

test("v3: the signature covers the method, the target URL and the body", async () => {
  const body = bodyOf(notification("contact.creation"));
  const ts = String(now());
  const wrongUri = call(body, {
    "x-hubspot-signature-v3": sigV3(body, ts, "https://other.example.test/hook"),
    "x-hubspot-request-timestamp": ts,
  });
  await assert.rejects(ingest("contact-created", wrongUri), /signature does not match/);
  await assert.rejects(
    ingest("contact-created", v3Call(body, ts), undefined, {}),
    /no recorded target URL/,
  );
  // percent-escapes HubSpot lists are decoded before signing
  const encoded =
    "https://api.example.test/triggers/webhooks/sub_1?a=%3A%2F%40%21%24%27%28%29%2A%2C%3B";
  const decoded = "https://api.example.test/triggers/webhooks/sub_1?a=:/@!$'()*,;";
  assert.equal(v3Uri(encoded), decoded);
  const raw = call(body, {
    "x-hubspot-signature-v3": sigV3(body, ts, decoded),
    "x-hubspot-request-timestamp": ts,
  });
  assert.equal(
    (await ingest("contact-created", raw, undefined, { callbackUrl: encoded })).length,
    1,
  );
});

test("v1: only signature version v1 is accepted", async () => {
  const body = bodyOf(notification("contact.creation"));
  for (const version of ["v2", undefined]) {
    const headers: Record<string, string> = { "x-hubspot-signature": sigV1(body) };
    if (version) headers["x-hubspot-signature-version"] = version;
    await assert.rejects(
      ingest("contact-created", call(body, headers)),
      /version is not supported/,
    );
  }
  const upper = call(body, {
    "X-HubSpot-Signature": sigV1(body).toUpperCase(),
    "X-HubSpot-Signature-Version": "v1",
  });
  assert.equal((await ingest("contact-created", upper)).length, 1);
});

test("errors never contain the secret, the signature or a header value", async () => {
  const body = bodyOf(notification("contact.creation"));
  const raw = call(body, {
    "x-hubspot-signature": "deadbeef-header-value",
    "x-hubspot-signature-version": "v1",
  });
  const err = await ingest("contact-created", raw).catch((e: Error) => e.message);
  assert.equal(typeof err, "string");
  assert.ok(!String(err).includes(SECRET));
  assert.ok(!String(err).includes("deadbeef-header-value"));
});

test("a body that is not JSON, signed correctly, is refused; a lone object is accepted as one event", async () => {
  const text = "not json";
  const ts = String(now());
  const raw: TriggerCall = {
    method: "POST",
    path: "/triggers/webhooks/sub_1",
    query: {},
    headers: { "x-hubspot-signature-v3": sigV3(text, ts), "x-hubspot-request-timestamp": ts },
    body: null,
    rawBody: text,
  };
  await assert.rejects(ingest("contact-created", raw), /not JSON/);
  const single = JSON.stringify(notification("contact.creation"));
  assert.equal((await ingest("contact-created", v3Call(single))).length, 1);
});

test("contact-updated: the properties param keeps only the named properties", async () => {
  const body = bodyOf(
    notification("contact.propertyChange", {
      propertyName: "lifecyclestage",
      propertyValue: "lead",
    }),
    notification("contact.propertyChange", { propertyName: "phone", propertyValue: "555" }),
  );
  const all = await ingest("contact-updated", v3Call(body));
  assert.deepEqual(all.map((e) => e.propertyName), ["lifecyclestage", "phone"]);
  const only = await ingest("contact-updated", v3Call(body), {
    signingSecret: SECRET,
    properties: " phone , email",
  });
  assert.deepEqual(only.map((e) => [e.propertyName, e.propertyValue]), [["phone", "555"]]);
  assert.equal(trigger("contact-created").params!.some((p) => p.key === "properties"), false);
});

test("any-event: every type by default; narrowed by events; generic object.* types are named by object", async () => {
  const body = bodyOf(
    notification("contact.creation", { objectId: 1 }),
    notification("conversation.newMessage", { objectId: 2 }),
    {
      ...notification("object.deletion", { objectId: 3 }),
      eventType: undefined,
      subscriptionType: "object.deletion",
      objectTypeId: "0-3",
    },
    {
      ...notification("object.merge", { objectId: 4 }),
      eventType: undefined,
      subscriptionType: "object.merge",
      objectTypeId: "2-9999",
    },
  );
  const all = await ingest("any-event", v3Call(body));
  assert.deepEqual(all.map((e) => e.eventType), [
    "contact.creation",
    "conversation.newMessage",
    "deal.deletion",
    "object.merge",
  ]);
  assert.equal(all[3].objectType, "2-9999");
  const some = await ingest("any-event", v3Call(body), {
    signingSecret: SECRET,
    events: "conversation.newMessage, deal.deletion",
  });
  assert.deepEqual(some.map((e) => e.objectId), ["2", "3"]);
  const none = await ingest("any-event", v3Call(body), {
    signingSecret: SECRET,
    events: "ticket.creation",
  });
  assert.deepEqual(none, []);
});

test("onSubscribe makes no HubSpot call and records the target URL; onUnsubscribe is a no-op", async () => {
  for (const key of [...NAMED.map(([k]) => k), "any-event"]) {
    const m = mockCtx();
    const state = await trigger(key).onSubscribe!(
      {
        params: {},
        subscriptionId: "s",
        callbackUrl: CALLBACK,
        hostUrl: "https://api.example.test",
      },
      m.ctx,
    );
    assert.deepEqual(state, { callbackUrl: CALLBACK });
    await trigger(key).onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, m.ctx);
    assert.equal(m.calls.length, 0);
  }
});
