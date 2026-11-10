import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import trigger from "../../triggers/files-changed.ts";

const SECRET = "test-app-secret";
const PARAMS = { appSecret: SECRET };
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY =
  `{ "list_folder":  { "accounts": [ "dbid:sample-account-1", "dbid:sample-account-2" ] },
  "delta": { "users": [ 12345678, 23456789 ] } }`;

const sign = (body: string, key = SECRET) => createHmac("sha256", key).update(body).digest("hex");
/** Same length, one character different: a flipped byte of the signature itself. */
const flip = (sig: string) => (sig[0] === "a" ? "b" : "a") + sig.slice(1);

function post(body: string | undefined, headers: Record<string, string>): TriggerCall {
  return {
    method: "POST",
    path: "/triggers/webhooks/sub_1",
    query: {},
    headers,
    body: body === undefined ? null : JSON.parse(body),
    ...(body === undefined ? {} : { rawBody: body }),
  };
}

const ingest = (raw: TriggerCall, params: Record<string, unknown> = PARAMS) =>
  Promise.resolve().then(() =>
    trigger.handleIngest!(
      { raw, params, state: { callbackUrl: "https://api.example.test/h" }, subscriptionId: "s" },
      mockCtx().ctx,
    )
  );

describe("files-changed (signed manual webhook)", () => {
  test("fixture: the body is not canonical JSON", () => {
    assert.notEqual(JSON.stringify(JSON.parse(BODY)), BODY);
  });

  test("the app ships it with output, sample and a secret param", () => {
    const t = app.triggers.find((x) => x.key === "files-changed")!;
    assert.ok(t.output.length > 0);
    assert.notEqual(t.sample, undefined);
    assert.equal(t.params!.find((p) => p.key === "appSecret")!.type, "secret");
  });

  test("onSubscribe makes no vendor call and keeps the callback URL; onUnsubscribe is a no-op", async () => {
    const m = mockCtx();
    const state = await trigger.onSubscribe!(
      { params: {}, subscriptionId: "s", callbackUrl: "https://api.example.test/h", hostUrl: "h" },
      m.ctx,
    );
    assert.deepEqual(state, { callbackUrl: "https://api.example.test/h" });
    await trigger.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, m.ctx);
    assert.equal(m.calls.length, 0);
  });

  test("a valid signature -> one event per account", async () => {
    const out = evs(await ingest(post(BODY, { "x-dropbox-signature": sign(BODY) })));
    assert.deepEqual(out, [
      { accountId: "dbid:sample-account-1" },
      { accountId: "dbid:sample-account-2" },
    ]);
  });

  test("the header name matches case-insensitively; accountId filters", async () => {
    const raw = post(BODY, { "X-Dropbox-Signature": sign(BODY) });
    assert.equal(evs(await ingest(raw)).length, 2);
    assert.deepEqual(
      evs(await ingest(raw, { ...PARAMS, accountId: " dbid:sample-account-2 " })),
      [{ accountId: "dbid:sample-account-2" }],
    );
  });

  test("one flipped byte of the SIGNATURE -> refused", async () => {
    const good = sign(BODY);
    assert.notEqual(flip(good), good);
    await assert.rejects(
      ingest(post(BODY, { "x-dropbox-signature": flip(good) })),
      /signature does not match/,
    );
  });

  test("a flipped LAST character, a truncated or an extended signature -> refused", async () => {
    const good = sign(BODY);
    const last = good.slice(-1) === "a" ? "b" : "a";
    for (
      const bad of [good.slice(0, -1) + last, good.slice(0, 8), good.slice(0, 32), good + "0"]
    ) {
      assert.notEqual(bad, good);
      await assert.rejects(
        ingest(post(BODY, { "x-dropbox-signature": bad })),
        /signature does not match/,
      );
    }
  });

  test("only POST (and the verification GET) is accepted, even with a valid signature", async () => {
    for (const method of ["PUT", "DELETE", "PATCH"]) {
      const raw = { ...post(BODY, { "x-dropbox-signature": sign(BODY) }), method };
      await assert.rejects(ingest(raw), /with POST/);
    }
  });

  test("one flipped byte of the BODY, or a signature over re-serialised JSON -> refused", async () => {
    await assert.rejects(
      ingest(post(BODY.replace("account-1", "account-9"), { "x-dropbox-signature": sign(BODY) })),
      /signature does not match/,
    );
    const re = JSON.stringify(JSON.parse(BODY));
    await assert.rejects(
      ingest(post(BODY, { "x-dropbox-signature": sign(re) })),
      /signature does not match/,
    );
  });

  test("header missing or empty, rawBody absent -> refused", async () => {
    await assert.rejects(ingest(post(BODY, {})), /signature does not match/);
    await assert.rejects(
      ingest(post(BODY, { "x-dropbox-signature": "" })),
      /signature does not match/,
    );
    await assert.rejects(
      ingest(post(undefined, { "x-dropbox-signature": sign(BODY) })),
      /raw body/,
    );
  });

  test("an unset or empty app secret refuses first, even for a signature made with an empty key", async () => {
    for (const params of [{}, { appSecret: "" }]) {
      await assert.rejects(ingest(post(BODY, {}), params), /not configured/);
      await assert.rejects(
        ingest(
          post(BODY, {
            "x-dropbox-signature": createHmac("sha256", "").update(BODY).digest("hex"),
          }),
          params,
        ),
        /not configured/,
      );
    }
  });

  test("errors never contain the secret or the signature", async () => {
    const bad = "0".repeat(64);
    const msg = await ingest(post(BODY, { "x-dropbox-signature": bad })).then(
      () => "",
      (e: Error) => e.message,
    );
    assert.ok(msg.length > 0);
    for (const leak of [SECRET, bad]) assert.equal(msg.includes(leak), false);
  });

  test("a signed body that is not a Dropbox notification -> refused", async () => {
    const other = `{ "hello":  "world" }`;
    await assert.rejects(
      ingest(post(other, { "x-dropbox-signature": sign(other) })),
      /Not a Dropbox notification/,
    );
  });

  test("the verification GET echoes the challenge as text/plain; malformed or unconfigured is refused", async () => {
    const get = (query: Record<string, string>): TriggerCall => ({
      method: "GET",
      path: "/triggers/webhooks/sub_1",
      query,
      headers: {},
      body: null,
    });
    const r = await ingest(get({ challenge: "abc-123" }));
    assert.deepEqual((r as { events: unknown[] }).events, []);
    assert.deepEqual((r as { response?: unknown }).response, {
      status: 200,
      headers: { "content-type": "text/plain" },
      body: "abc-123",
    });
    await assert.rejects(ingest(get({})), /challenge is missing/);
    await assert.rejects(ingest(get({ challenge: "x".repeat(257) })), /challenge is missing/);
    await assert.rejects(ingest(get({ challenge: "abc" }), {}), /not configured/);
  });
});
