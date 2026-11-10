import { test } from "node:test";
import { createHash, createHmac } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import type { TriggerCall } from "@w6w/types";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import deploy from "../../triggers/deploy.ts";
import deploySucceeded from "../../triggers/deploy-succeeded.ts";
import deployFailed from "../../triggers/deploy-failed.ts";

/** This app's `_assert.ts` has no `assert`; a boolean `assertEquals` is the same check. */
const assert = (cond: unknown, msg?: string) => assertEquals(!!cond, true, msg);

const CALLBACK = "https://api.example.test/triggers/webhooks/sub_abc";
const HOST = "https://api.example.test";
const SECRET = "jws-secret-token-for-tests-0123456789";

/** Narrow the `E[] | { events, response? }` union (brief §3) before indexing. */
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

/** Non-canonical whitespace: `JSON.stringify(JSON.parse(BODY)) !== BODY`. */
const BODY =
  `{ "id" : "5d6e7f8a", "site_id":"site-1",  "name": "my-site",\n "state" : "ready", "branch":"main", "error_message": null, "context":"production" }`;

const b64u = (v: string | Buffer) => Buffer.from(v).toString("base64url");
const sha = (body: string) => createHash("sha256").update(body).digest("hex");

/** A compact JWS the way Netlify documents it: HS256, claims `iss` and `sha256`. */
function jws(
  body: string,
  opts: { secret?: string; header?: object; claims?: object; alg?: string } = {},
): string {
  const h = b64u(JSON.stringify(opts.header ?? { alg: "HS256", typ: "JWT" }));
  const p = b64u(JSON.stringify(opts.claims ?? { iss: "netlify", sha256: sha(body) }));
  const sig = createHmac(opts.alg ?? "sha256", opts.secret ?? SECRET).update(`${h}.${p}`).digest(
    "base64url",
  );
  return `${h}.${p}.${sig}`;
}

function call(rawBody: string | undefined, headers: Record<string, string>): TriggerCall {
  const c: TriggerCall = {
    method: "POST",
    path: "/triggers/webhooks/sub_abc",
    query: {},
    headers,
    body: rawBody === undefined ? null : JSON.parse(rawBody),
  };
  if (rawBody !== undefined) c.rawBody = rawBody;
  return c;
}

function ingest(
  trigger: typeof deploy,
  raw: TriggerCall,
  params: Record<string, unknown> = { signingSecret: SECRET },
) {
  return trigger.handleIngest!(
    { raw, params, state: { callbackUrl: CALLBACK }, subscriptionId: "sub_abc" },
    mockCtx().ctx,
  );
}

const good = (body = BODY) => ({ "x-webhook-signature": jws(body) });

test("app: the signed deploy webhook triggers each carry output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), [
    "deploy",
    "deploy-succeeded",
    "deploy-failed",
    "deploy-started",
    "submission-created",
    "new-site",
    "new-form",
  ]);
  for (const t of app.triggers.filter((t) => t.key.startsWith("deploy"))) {
    assert(t.output!.length > 0, `${t.key} output`);
    assert(t.sample !== undefined, `${t.key} sample`);
    assert(typeof t.onSubscribe === "function" && typeof t.onUnsubscribe === "function");
    assert(typeof t.handleIngest === "function");
    assertEquals(typeof (t as { poll?: unknown }).poll, "undefined");
    assertEquals(t.params!.find((p) => p.key === "signingSecret")!.type, "secret");
  }
});

test("the fixture body is not canonical JSON", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("valid JWS over a non-canonical raw body -> one event", async () => {
  assertEquals(evs(await ingest(deploy, call(BODY, good()))), [{
    deployId: "5d6e7f8a",
    siteId: "site-1",
    siteName: "my-site",
    state: "ready",
    context: "production",
    branch: "main",
    commitRef: null,
    url: null,
    deployUrl: null,
    errorMessage: null,
    createdAt: null,
    deploy: JSON.parse(BODY),
  }]);
});

test("a body hash claimed over the re-serialised body is refused", async () => {
  const resigned = jws(BODY, {
    claims: { iss: "netlify", sha256: sha(JSON.stringify(JSON.parse(BODY))) },
  });
  await assertRejects(
    () => ingest(deploy, call(BODY, { "x-webhook-signature": resigned })),
    Error,
    "body hash",
  );
});

test("one flipped byte in the body is refused (signature still valid for the old body)", async () => {
  await assertRejects(
    () => ingest(deploy, call(BODY.replace("my-site", "my-sita"), good(BODY))),
    Error,
    "body hash",
  );
});

test("one flipped byte in the JWS signature is refused", async () => {
  const t = jws(BODY);
  const flipped = t.slice(0, -1) + (t.endsWith("A") ? "B" : "A");
  await assertRejects(
    () => ingest(deploy, call(BODY, { "x-webhook-signature": flipped })),
    Error,
    "signature does not match",
  );
});

test("a JWS signed with another secret is refused", async () => {
  await assertRejects(
    () => ingest(deploy, call(BODY, { "x-webhook-signature": jws(BODY, { secret: "other" }) })),
    Error,
    "signature does not match",
  );
});

test("alg none and non-HS256 algorithms are refused", async () => {
  const none = `${b64u(JSON.stringify({ alg: "none" }))}.${
    b64u(JSON.stringify({ iss: "netlify", sha256: sha(BODY) }))
  }.`;
  await assertRejects(
    () => ingest(deploy, call(BODY, { "x-webhook-signature": none })),
    Error,
    "HS256",
  );
  const hs512 = jws(BODY, { header: { alg: "HS512" }, alg: "sha512" });
  await assertRejects(
    () => ingest(deploy, call(BODY, { "x-webhook-signature": hs512 })),
    Error,
    "HS256",
  );
});

test("a validly signed JWS whose issuer is not netlify, or with no body hash, is refused", async () => {
  await assertRejects(
    () =>
      ingest(
        deploy,
        call(BODY, {
          "x-webhook-signature": jws(BODY, { claims: { iss: "someone", sha256: sha(BODY) } }),
        }),
      ),
    Error,
    "not issued by Netlify",
  );
  await assertRejects(
    () =>
      ingest(
        deploy,
        call(BODY, {
          "x-webhook-signature": jws(BODY, { claims: { iss: "netlify" } }),
        }),
      ),
    Error,
    "body hash",
  );
});

test("signature header missing or malformed is refused", async () => {
  await assertRejects(() => ingest(deploy, call(BODY, {})), Error, "no signature");
  for (const bad of ["", "abc", "a.b", "a.b.c.d", "!!!.???.***"]) {
    await assertRejects(
      () => ingest(deploy, call(BODY, { "x-webhook-signature": bad })),
      Error,
      "Netlify delivery refused",
    );
  }
});

test("rawBody absent is refused", async () => {
  await assertRejects(() => ingest(deploy, call(undefined, good())), Error, "raw body");
});

test("unset or empty secret is refused, even with the header absent", async () => {
  for (const params of [{}, { signingSecret: "" }, { signingSecret: undefined }]) {
    await assertRejects(() => ingest(deploy, call(BODY, {}), params), Error, "secret");
    await assertRejects(() => ingest(deploy, call(BODY, good()), params), Error, "secret");
    // A JWS "signed" with the empty key must not pass either.
    await assertRejects(
      () =>
        ingest(deploy, call(BODY, { "x-webhook-signature": jws(BODY, { secret: "" }) }), params),
      Error,
      "secret",
    );
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(
    () => ingest(deploy, { ...call(BODY, good()), method: "GET" }),
    Error,
    "POST",
  );
});

test("error text never echoes the secret, a signature or a header value", async () => {
  const wrong = jws(BODY, { secret: "other" });
  const cases: Array<() => Promise<unknown>> = [
    () => ingest(deploy, call(BODY, { "x-webhook-signature": wrong })),
    () => ingest(deploy, call(undefined, good())),
    () => ingest(deploy, call(BODY, good()), { signingSecret: "" }),
    () => ingest(deploy, call(BODY, { "x-webhook-signature": "a.b.c" })),
  ];
  for (const run of cases) {
    let threw: Error | undefined;
    try {
      await run();
    } catch (err) {
      threw = err as Error;
    }
    assert(threw, "should have thrown");
    const m = threw!.message;
    for (const leak of [SECRET, wrong, jws(BODY), wrong.split(".")[2]]) assert(!m.includes(leak));
  }
});

test("site and state filters (verified first)", async () => {
  assertEquals(
    evs(await ingest(deploy, call(BODY, good()), { signingSecret: SECRET, siteId: "site-2" })),
    [],
  );
  assertEquals(
    evs(await ingest(deploy, call(BODY, good()), { signingSecret: SECRET, siteId: "site-1" }))
      .length,
    1,
  );
  assertEquals(
    evs(
      await ingest(deploy, call(BODY, good()), {
        signingSecret: SECRET,
        states: "error, building",
      }),
    ),
    [],
  );
  assertEquals(
    evs(
      await ingest(deploy, call(BODY, good()), {
        signingSecret: SECRET,
        states: "building, ready",
      }),
    )
      .length,
    1,
  );
  // A filtered-out delivery still has to be authentic.
  await assertRejects(
    () =>
      ingest(deploy, call(BODY, { "x-webhook-signature": jws(BODY, { secret: "other" }) }), {
        signingSecret: SECRET,
        states: "error",
      }),
    Error,
    "signature does not match",
  );
});

test("deploy-succeeded keeps ready; deploy-failed keeps error", async () => {
  const failed = BODY.replace('"ready"', '"error"');
  assertEquals(evs(await ingest(deploySucceeded, call(BODY, good()))).length, 1);
  assertEquals(evs(await ingest(deploySucceeded, call(failed, good(failed)))), []);
  assertEquals(evs(await ingest(deployFailed, call(BODY, good()))), []);
  assertEquals(evs(await ingest(deployFailed, call(failed, good(failed)))).length, 1);
});

test("manual webhook: onSubscribe makes no Netlify call and returns the callback URL; onUnsubscribe is a no-op", async () => {
  const { ctx, calls } = mockCtx();
  const state = await deploy.onSubscribe!(
    { params: {}, subscriptionId: "sub_abc", callbackUrl: CALLBACK, hostUrl: HOST },
    ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  await deploy.onUnsubscribe!({ params: {}, state, subscriptionId: "sub_abc" }, ctx);
  assertEquals(calls.length, 0);
});
