import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import { envelope, mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import jobFinished from "../../triggers/job-finished.ts";
import jobFailed from "../../triggers/job-failed.ts";
import jobCreated from "../../triggers/job-created.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "webhook-signing-secret-for-tests-0123";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const STATE = { webhookId: "4354367", signingSecret: SECRET };
const ok = (cond: unknown, msg: string) => assertEquals(Boolean(cond), true, msg);

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const body = (event: string, status: string) =>
  `{ "event" : "${event}",
  "job":{ "id":"4b6ee8e2-e293-4805-b48e-a03876d1ec66", "tag":"invoice-4411",
    "status": "${status}", "created_at":"2026-11-10T09:18:47+00:00",
    "ended_at" : null, "tasks":[ {"id":"t1","name":"export-1","status":"${status}"} ] } }`;
const FINISHED = body("job.finished", "finished");
const FAILED = body("job.failed", "error");
const CREATED = body("job.created", "waiting");

const sign = (b: string, secret = SECRET) => createHmac("sha256", secret).update(b).digest("hex");

const call = (
  b: string,
  over: Record<string, unknown> = {},
  secret: string | undefined | null = SECRET,
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "cloudconvert-signature": sign(b) } as Record<string, string>,
    body: JSON.parse(b),
    rawBody: b,
    ...over,
  },
  params: {},
  state: secret === null
    ? { webhookId: "4354367" }
    : { webhookId: "4354367", signingSecret: secret },
  subscriptionId: "sub_1",
});

const ingest = (t: typeof jobFinished, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);
const withSig = (b: string, signature: string) =>
  call(b, { headers: { "cloudconvert-signature": signature } });

test("fixture body has non-canonical whitespace", () => {
  ok(JSON.stringify(JSON.parse(FINISHED)) !== FINISHED, "fixture must be non-canonical");
});

test("app declares the three webhook triggers with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key), ["job-finished", "job-failed", "job-created"]);
  for (const t of app.triggers) {
    ok(t.output!.length > 0, "output");
    ok(t.sample !== undefined, "sample");
    assertEquals(t.poll, undefined);
  }
});

test("valid signature → one normalized event per job event", async () => {
  const a = evs(await ingest(jobFinished, call(FINISHED))) as Array<Record<string, unknown>>;
  assertEquals(a.length, 1);
  assertEquals(a[0].event, "job.finished");
  assertEquals(a[0].jobId, "4b6ee8e2-e293-4805-b48e-a03876d1ec66");
  assertEquals(a[0].tag, "invoice-4411");
  assertEquals(a[0].status, "finished");
  assertEquals((a[0].tasks as unknown[]).length, 1);
  const b = evs(await ingest(jobFailed, call(FAILED))) as Array<Record<string, unknown>>;
  assertEquals(b[0].status, "error");
  const c = evs(await ingest(jobCreated, call(CREATED))) as Array<Record<string, unknown>>;
  assertEquals(c[0].event, "job.created");
});

test("another event is acknowledged with no event", async () => {
  assertEquals(evs(await ingest(jobFinished, call(FAILED))), []);
});

test("one flipped byte in the body → refused", async () => {
  const forged = FINISHED.replace("invoice-4411", "invoice-4412");
  await assertRejects(
    () =>
      ingest(jobFinished, call(forged, { headers: { "cloudconvert-signature": sign(FINISHED) } })),
    Error,
    "signature",
  );
});

test("signature made with another secret → refused", async () => {
  const c = withSig(FINISHED, sign(FINISHED, "another-secret-value-xxxxxxxx"));
  await assertRejects(() => ingest(jobFinished, c), Error, "signature");
});

test("header missing → refused", async () => {
  await assertRejects(
    () => ingest(jobFinished, call(FINISHED, { headers: {} })),
    Error,
    "CloudConvert-Signature",
  );
});

test("rawBody absent → refused, even with a correct signature", async () => {
  const c = call(FINISHED);
  delete (c.raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest(jobFinished, c), Error, "raw body");
});

test("unset or empty secret + absent or empty header → refused", async () => {
  for (const secret of [null, ""]) {
    for (const headers of [{}, { "cloudconvert-signature": "" }]) {
      await assertRejects(
        () => ingest(jobFinished, call(FINISHED, { headers }, secret)),
        Error,
        "secret",
      );
    }
  }
});

test("a body with leading and trailing whitespace is verified over the exact bytes", async () => {
  const b = `\n  ${FINISHED}  \n`;
  assertEquals(evs(await ingest(jobFinished, withSig(b, sign(b)))).length, 1);
  await assertRejects(() => ingest(jobFinished, withSig(b, sign(b.trim()))), Error, "signature");
});

test("a signed body that is not a CloudConvert job notification is refused", async () => {
  const signedRaw = (b: string) =>
    call(FINISHED, { rawBody: b, headers: { "cloudconvert-signature": sign(b) } });
  await assertRejects(
    () => ingest(jobFinished, signedRaw('{"event":"job.finished"}')),
    Error,
    "`job`",
  );
  await assertRejects(() => ingest(jobFinished, signedRaw("not json")), Error, "not JSON");
});

test("errors never contain the secret, the signature or the header value", async () => {
  const sig = sign(FINISHED, "another-secret-value-xxxxxxxx");
  try {
    await ingest(jobFinished, withSig(FINISHED, sig));
    throw new Error("must throw");
  } catch (e) {
    const m = (e as Error).message;
    ok(m !== "must throw" && !m.includes(SECRET) && !m.includes(sig), "no secret or signature");
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(
    () => ingest(jobFinished, call(FINISHED, { method: "GET" })),
    Error,
    "POST",
  );
});

test("onSubscribe registers one webhook for the trigger's event and keeps id and secret", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope({
        id: 4354367,
        url: CALLBACK,
        events: ["job.finished"],
        signing_secret: SECRET,
      }),
    },
  ]);
  const state = await jobFinished.onSubscribe!(
    { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(state, { webhookId: "4354367", signingSecret: SECRET });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.cloudconvert.com/v2/webhooks");
  assertEquals(JSON.parse(calls[0].body!), { url: CALLBACK, events: ["job.finished"] });
});

test("each trigger registers its own event", async () => {
  const cases: Array<[typeof jobFinished, string]> = [
    [jobFinished, "job.finished"],
    [jobFailed, "job.failed"],
    [jobCreated, "job.created"],
  ];
  for (const [t, event] of cases) {
    const { ctx, calls } = mockCtx([{ body: envelope({ id: 1, signing_secret: SECRET }) }]);
    await t.onSubscribe!(
      { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
      ctx,
    );
    assertEquals(JSON.parse(calls[0].body!).events, [event]);
  }
});

test("onSubscribe with no signing secret in the answer takes the webhook down and throws", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 77 }) }, { status: 204 }]);
  await assertRejects(
    () =>
      jobFinished.onSubscribe!(
        { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
        ctx,
      ),
    Error,
    "signing secret",
  );
  assertEquals(calls.map((c) => `${c.method} ${c.url}`), [
    "POST https://api.cloudconvert.com/v2/webhooks",
    "DELETE https://api.cloudconvert.com/v2/webhooks/77",
  ]);
});

test("onUnsubscribe deletes the webhook; one already gone (404 or 410) counts as deleted", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await jobFinished.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "sub_1" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.cloudconvert.com/v2/webhooks/4354367");
  for (const status of [404, 410]) {
    const m = mockCtx([{ status, body: { message: "gone", code: "NOT_FOUND" } }]);
    await jobFinished.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "sub_1" }, m.ctx);
    assertEquals(m.calls.length, 1);
  }
});

test("onUnsubscribe propagates a real failure and ignores a subscription with no webhook id", async () => {
  const m = mockCtx([{ status: 500, body: { message: "boom" } }]);
  await assertRejects(
    () => jobFinished.onUnsubscribe!({ params: {}, state: STATE, subscriptionId: "sub_1" }, m.ctx),
    Error,
    "500",
  );
  const n = mockCtx();
  await jobFinished.onUnsubscribe!({ params: {}, state: {}, subscriptionId: "sub_1" }, n.ctx);
  assertEquals(n.calls.length, 0);
});
