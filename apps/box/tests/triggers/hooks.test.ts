import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import fileUploaded from "../../triggers/file-uploaded.ts";
import activity from "../../triggers/activity.ts";

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const PRIMARY = "primary-signature-key-0123456789";
const SECONDARY = "secondary-signature-key-abcdefghij";
const PARAMS = { primaryKey: PRIMARY, secondaryKey: SECONDARY };
const STATE = {
  webhookId: "WH1",
  targetType: "folder",
  targetId: "0",
  triggers: ["FILE.UPLOADED"],
};
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY = `{ "type": "webhook_event",  "id": "EV1", "created_at": "2026-01-01T12:00:00-08:00",
  "trigger": "FILE.UPLOADED", "webhook": { "id": "WH1", "type": "webhook" },
  "created_by": { "id": "11446498", "type": "user", "name": "Alex", "login": "alex@example.com" },
  "source": { "id": "987654321", "type": "file", "name": "report.pdf" } }`;

const sign = (body: string, ts: string, key: string) =>
  createHmac("sha256", key).update(body).update(ts).digest("base64");
const stamp = (offsetSec = 0) => new Date(Date.now() + offsetSec * 1000).toISOString();

function call(body: string | undefined, headers: Record<string, string>): TriggerCall {
  return {
    method: "POST",
    path: "/triggers/webhooks/sub_1",
    query: {},
    headers,
    body: body === undefined ? null : JSON.parse(body),
    ...(body === undefined ? {} : { rawBody: body }),
  };
}

function signed(body = BODY, ts = stamp(), extra: Record<string, string> = {}) {
  return call(body, {
    "box-delivery-timestamp": ts,
    "box-signature-primary": sign(body, ts, PRIMARY),
    "box-signature-secondary": sign(body, ts, SECONDARY),
    "box-signature-version": "1",
    "box-signature-algorithm": "HmacSHA256",
    ...extra,
  });
}

function ingest(
  t: typeof fileUploaded,
  raw: TriggerCall,
  params: Record<string, unknown> = PARAMS,
  state: unknown = STATE,
) {
  return Promise.resolve().then(() =>
    t.handleIngest!({ raw, params, state: state as never, subscriptionId: "sub_1" }, mockCtx().ctx)
  );
}

test("fixture: the body is not canonical JSON", () => {
  assert.notEqual(JSON.stringify(JSON.parse(BODY)), BODY);
});

test("app: declares both triggers with output and sample; signature keys are secret params", () => {
  assert.deepEqual(app.triggers.map((t) => t.key), ["file-uploaded", "activity"]);
  for (const t of app.triggers) {
    assert.ok(t.output.length > 0);
    assert.notEqual(t.sample, undefined);
    assert.equal(t.params!.find((p) => p.key === "primaryKey")!.type, "secret");
    assert.equal(t.params!.find((p) => p.key === "secondaryKey")!.type, "secret");
  }
});

test("onSubscribe: lists and deletes leftovers on our URL, then POST /webhooks on the folder", async () => {
  const m = mockCtx([
    {
      body: {
        entries: [{ id: "OLD", address: CALLBACK }, { id: "X", address: "https://x.example/h" }],
        next_marker: null,
      },
    },
    { status: 204 },
    { status: 201, body: { id: "WH1", type: "webhook" } },
  ]);
  const state = await fileUploaded.onSubscribe!(
    { params: { targetId: " 42 " }, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "h" },
    m.ctx,
  );
  assert.deepEqual(m.calls.map((c) => [c.method, c.url]), [
    ["GET", "https://api.box.com/2.0/webhooks?limit=100"],
    ["DELETE", "https://api.box.com/2.0/webhooks/OLD"],
    ["POST", "https://api.box.com/2.0/webhooks"],
  ]);
  assert.deepEqual(JSON.parse(m.calls[2].body!), {
    target: { id: "42", type: "folder" },
    address: CALLBACK,
    triggers: ["FILE.UPLOADED"],
  });
  assert.deepEqual(state, {
    webhookId: "WH1",
    targetType: "folder",
    targetId: "42",
    triggers: ["FILE.UPLOADED"],
  });
});

test("onSubscribe (activity): a chosen file target and normalised trigger names; bad input refused before any call", async () => {
  const m = mockCtx([{ body: { entries: [] } }, { body: { id: "WH2" } }]);
  await activity.onSubscribe!(
    {
      params: {
        targetType: "file",
        targetId: "7",
        triggers: "file.deleted, COMMENT.CREATED,file.deleted",
      },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "h",
    },
    m.ctx,
  );
  assert.deepEqual(JSON.parse(m.calls[1].body!), {
    target: { id: "7", type: "file" },
    address: CALLBACK,
    triggers: ["FILE.DELETED", "COMMENT.CREATED"],
  });
  const none = mockCtx();
  const sub = (params: Record<string, unknown>) =>
    activity.onSubscribe!(
      { params, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "h" },
      none.ctx,
    );
  await assert.rejects(sub({ targetId: "7", triggers: "" }), /at least one Box trigger/);
  await assert.rejects(sub({ targetId: "7", triggers: "uploaded" }), /Not a Box trigger name/);
  await assert.rejects(sub({ triggers: "FILE.UPLOADED" }), /id of the Box folder or file/);
  assert.equal(none.calls.length, 0);
});

test("onUnsubscribe: DELETE the webhook; 404 and 410 are already gone; other errors propagate", async () => {
  const ok = mockCtx([{ status: 204 }]);
  await fileUploaded.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, ok.ctx);
  assert.deepEqual([ok.calls[0].method, ok.calls[0].url], [
    "DELETE",
    "https://api.box.com/2.0/webhooks/WH1",
  ]);
  for (const status of [404, 410]) {
    const m = mockCtx([{ status, body: { code: "not_found" } }]);
    await fileUploaded.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, m.ctx);
  }
  const bad = mockCtx([{ status: 500, body: {} }]);
  await assert.rejects(
    fileUploaded.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "s" }, bad.ctx),
    /Box 500/,
  );
});

test("valid signature over body + timestamp -> one event", async () => {
  const [e] = evs(await ingest(fileUploaded, signed())) as Array<Record<string, unknown>>;
  assert.deepEqual(
    [e.eventId, e.trigger, e.webhookId, e.sourceType, e.sourceId, e.sourceName, e.createdByLogin],
    ["EV1", "FILE.UPLOADED", "WH1", "file", "987654321", "report.pdf", "alex@example.com"],
  );
});

test("header names match case-insensitively", async () => {
  const ts = stamp();
  const raw = call(BODY, {
    "BOX-DELIVERY-TIMESTAMP": ts,
    "BOX-SIGNATURE-PRIMARY": sign(BODY, ts, PRIMARY),
  });
  assert.equal(evs(await ingest(fileUploaded, raw)).length, 1);
});

test("either key is enough: only the secondary header matches (key rotation)", async () => {
  const ts = stamp();
  const raw = call(BODY, {
    "box-delivery-timestamp": ts,
    "box-signature-primary": sign(BODY, ts, "retired-key"),
    "box-signature-secondary": sign(BODY, ts, SECONDARY),
  });
  assert.equal(evs(await ingest(fileUploaded, raw)).length, 1);
  // ...but not when the secondary key is not configured here.
  await assert.rejects(ingest(fileUploaded, raw, { primaryKey: PRIMARY }), /does not match/);
});

test("one flipped byte, or a signature over re-serialised JSON -> refused", async () => {
  const ts = stamp();
  const hs = {
    "box-delivery-timestamp": ts,
    "box-signature-primary": sign(BODY, ts, PRIMARY),
    "box-signature-secondary": sign(BODY, ts, SECONDARY),
  };
  await assert.rejects(
    ingest(fileUploaded, call(BODY.replace("EV1", "EV2"), hs)),
    /does not match/,
  );
  const re = JSON.stringify(JSON.parse(BODY));
  await assert.rejects(
    ingest(
      fileUploaded,
      call(BODY, {
        ...hs,
        "box-signature-primary": sign(re, ts, PRIMARY),
        "box-signature-secondary": sign(re, ts, SECONDARY),
      }),
    ),
    /does not match/,
  );
});

test("the timestamp is part of the signed message", async () => {
  const ts = stamp();
  const raw = call(BODY, {
    "box-delivery-timestamp": stamp(-5),
    "box-signature-primary": sign(BODY, ts, PRIMARY),
  });
  await assert.rejects(ingest(fileUploaded, raw), /does not match/);
});

test("signature headers missing or empty -> refused", async () => {
  const ts = stamp();
  await assert.rejects(
    ingest(fileUploaded, call(BODY, { "box-delivery-timestamp": ts })),
    /does not match/,
  );
  await assert.rejects(
    ingest(
      fileUploaded,
      call(BODY, {
        "box-delivery-timestamp": ts,
        "box-signature-primary": "",
        "box-signature-secondary": "",
      }),
    ),
    /does not match/,
  );
  await assert.rejects(
    ingest(fileUploaded, call(BODY, { "box-signature-primary": sign(BODY, ts, PRIMARY) })),
    /timestamp is missing/,
  );
});

test("rawBody absent -> refused", async () => {
  const ts = stamp();
  await assert.rejects(
    ingest(
      fileUploaded,
      call(undefined, {
        "box-delivery-timestamp": ts,
        "box-signature-primary": sign(BODY, ts, PRIMARY),
      }),
    ),
    /raw body/,
  );
});

test("stale (over ten minutes), future and unparseable timestamps -> refused; nine minutes passes", async () => {
  await assert.rejects(
    ingest(fileUploaded, signed(BODY, stamp(-660))),
    /outside the allowed window/,
  );
  await assert.rejects(
    ingest(fileUploaded, signed(BODY, stamp(660))),
    /outside the allowed window/,
  );
  await assert.rejects(
    ingest(fileUploaded, signed(BODY, "yesterday")),
    /outside the allowed window/,
  );
  assert.equal(evs(await ingest(fileUploaded, signed(BODY, stamp(-540)))).length, 1);
});

test("an unknown signature version or algorithm -> refused", async () => {
  await assert.rejects(
    ingest(fileUploaded, signed(BODY, stamp(), { "box-signature-version": "2" })),
    /not supported/,
  );
  await assert.rejects(
    ingest(fileUploaded, signed(BODY, stamp(), { "box-signature-algorithm": "HmacSHA1" })),
    /not supported/,
  );
});

test("unset or empty primary key refuses, even with absent headers; an empty secondary is ignored", async () => {
  for (
    const params of [{}, { primaryKey: "" }, { primaryKey: undefined, secondaryKey: SECONDARY }]
  ) {
    await assert.rejects(ingest(fileUploaded, call(BODY, {}), params), /not configured/);
    await assert.rejects(ingest(fileUploaded, signed(), params), /not configured/);
  }
  // A signature made with an empty key must not verify when secondaryKey is "".
  const ts = stamp();
  const raw = call(BODY, {
    "box-delivery-timestamp": ts,
    "box-signature-secondary": createHmac("sha256", "").update(BODY).update(ts).digest("base64"),
  });
  await assert.rejects(
    ingest(fileUploaded, raw, { primaryKey: PRIMARY, secondaryKey: "" }),
    /does not match/,
  );
});

test("errors never contain a key, a signature or the timestamp", async () => {
  const ts = stamp();
  const bad = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  const msg = await ingest(
    fileUploaded,
    call(BODY, { "box-delivery-timestamp": ts, "box-signature-primary": bad }),
  ).then(() => "", (e: Error) => e.message);
  assert.ok(msg.length > 0);
  for (const leak of [PRIMARY, SECONDARY, bad, ts]) assert.equal(msg.includes(leak), false);
});

test("triggers outside the subscription are acknowledged without an event", async () => {
  const del = BODY.replace("FILE.UPLOADED", "FILE.DELETED");
  assert.deepEqual(evs(await ingest(fileUploaded, signed(del))), []);
  assert.equal(
    evs(
      await ingest(activity, signed(del), PARAMS, {
        ...STATE,
        triggers: ["FILE.DELETED", "FILE.UPLOADED"],
      }),
    ).length,
    1,
  );
});
