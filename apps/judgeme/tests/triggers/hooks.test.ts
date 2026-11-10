import { test } from "node:test";
import { createHmac } from "node:crypto";
import nodeAssert from "node:assert/strict";
import { assert, assertEquals } from "../_assert.ts";
import { errorBody, mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import reviewCreated from "../../triggers/review-created.ts";
import reviewUpdated from "../../triggers/review-updated.ts";

// The generated _assert.ts has no assertRejects: same contract, on node:assert.
async function assertRejects(fn: () => Promise<unknown>, _cls: unknown, includes: string) {
  await nodeAssert.rejects(fn, (e: unknown) => e instanceof Error && e.message.includes(includes));
}

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-private-api-token-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Independent of app code: node:crypto, hex HMAC-SHA256 of the exact body.
const sign = (body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(body).digest("hex");

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const BODY = `{ "id" : 4242,  "rating":5, "title":"Great",
  "body":"Works  well", "reviewer":{ "name":"Ada" } }`;

const call = (
  b: string | null,
  over: { headers?: Record<string, string>; method?: string; omitRaw?: boolean } = {},
  secret: string | null = SECRET,
) => ({
  raw: {
    method: over.method ?? "POST",
    path: "/",
    query: {},
    headers: over.headers ?? (b === null ? {} : { "judgeme-hmac-sha256": sign(b) }),
    body: b === null ? null : JSON.parse(b),
    ...(b === null || over.omitRaw ? {} : { rawBody: b }),
  },
  params: { signingSecret: secret === null ? undefined : secret },
  state: { key: "review/created", url: CALLBACK },
  subscriptionId: "sub_1",
});

type Ingest = (typeof reviewCreated)["handleIngest"];
const run = (t: { handleIngest?: Ingest }, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);

const triggers = [
  { t: reviewCreated, key: "review-created", webhook: "review/created" },
  { t: reviewUpdated, key: "review-updated", webhook: "review/updated" },
];

test("fixture body has non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("app declares both webhook triggers with output and sample, no poll", () => {
  assertEquals(app.triggers.map((t) => t.key), triggers.map((x) => x.key));
  for (const { t } of triggers) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(t.params!.find((p) => p.key === "signingSecret")!.type, "secret");
  }
});

for (const { t, key, webhook } of triggers) {
  test(`${key}: valid signature over a non-canonical body → one event with the payload`, async () => {
    const out = evs(await run(t, call(BODY))) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].key, webhook);
    assertEquals(out[0].reviewId, "4242");
    assertEquals((out[0].payload as Record<string, unknown>).rating, 5);
  });

  test(`${key}: the X-Judgeme-Hmac-SHA256 spelling and upper-case hex verify too`, async () => {
    const h = { "X-Judgeme-Hmac-SHA256": sign(BODY).toUpperCase() };
    assertEquals(evs(await run(t, call(BODY, { headers: h }))).length, 1);
  });

  test(`${key}: one flipped byte in the body → throws`, async () => {
    const input = call(BODY.replace("Great", "Greaz"), {
      headers: { "judgeme-hmac-sha256": sign(BODY) },
    });
    await assertRejects(() => run(t, input), Error, "signature does not match");
  });

  test(`${key}: signature header missing → throws`, async () => {
    await assertRejects(() => run(t, call(BODY, { headers: {} })), Error, "JUDGEME-HMAC-SHA256");
  });

  test(`${key}: rawBody absent → throws`, async () => {
    await assertRejects(() => run(t, call(BODY, { omitRaw: true })), Error, "raw body");
  });

  test(`${key}: unset or empty secret → refused before any compare`, async () => {
    await assertRejects(() => run(t, call(BODY, {}, null)), Error, "secret");
    await assertRejects(() => run(t, call(BODY, {}, "")), Error, "secret");
    await assertRejects(
      () => run(t, call(BODY, { headers: { "judgeme-hmac-sha256": "" } }, "")),
      Error,
      "secret",
    );
  });

  test(`${key}: signature made with another secret → throws`, async () => {
    const input = call(BODY, { headers: { "judgeme-hmac-sha256": sign(BODY, "other") } });
    await assertRejects(() => run(t, input), Error, "signature does not match");
  });
}

test("review nested under `review` supplies the id; no id → reviewId null", async () => {
  const nested = '{ "review" : { "id" : 77 } , "x" : 1 }';
  const [a] = evs(await run(reviewCreated, call(nested))) as Array<Record<string, unknown>>;
  assertEquals(a.reviewId, "77");
  const [b] = evs(await run(reviewCreated, call('{ "x" : 1 }'))) as Array<Record<string, unknown>>;
  assertEquals(b.reviewId, null);
});

test("a signed body that is not a JSON object throws; a GET is refused", async () => {
  await assertRejects(() => run(reviewCreated, call("[ 1, 2 ]")), Error, "JSON object");
  const xml = "<review><id>1</id></review>";
  const input = call(BODY);
  const bad = {
    ...input,
    raw: { ...input.raw, rawBody: xml, headers: { "judgeme-hmac-sha256": sign(xml) } },
  };
  await assertRejects(() => run(reviewCreated, bad), Error, "not JSON");
  await assertRejects(() => run(reviewCreated, call(BODY, { method: "GET" })), Error, "POST");
});

test("errors never echo the secret, the signature or the body", async () => {
  const bad = sign(BODY, "other");
  try {
    await run(reviewCreated, call(BODY, { headers: { "judgeme-hmac-sha256": bad } }));
    assert(false, "should have thrown");
  } catch (e) {
    const m = (e as Error).message;
    assert(
      !m.includes(SECRET) && !m.includes(bad) && !m.includes(sign(BODY)) && !m.includes("4242"),
    );
  }
});

for (const { t, webhook } of triggers) {
  test(`${webhook}: onSubscribe POSTs { webhook: { key, url } } and keeps the pair in state`, async () => {
    const { ctx, calls } = mockCtx([{ body: { shop_id: 1, webhook: { key: webhook } } }]);
    const state = await t.onSubscribe!(
      { params: {}, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
      ctx,
    );
    assertEquals(state, { key: webhook, url: CALLBACK });
    assertEquals(calls.length, 1);
    assertEquals(calls[0].method, "POST");
    assertEquals(new URL(calls[0].url).pathname, "/api/v1/webhooks");
    assertEquals(JSON.parse(calls[0].body!), { webhook: { key: webhook, url: CALLBACK } });
  });
}

test("onUnsubscribe DELETEs { key, url }; 404 counts as gone, other errors propagate", async () => {
  const state = { key: "review/created", url: CALLBACK };
  const ok = mockCtx([{ body: {} }]);
  await reviewCreated.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, ok.ctx);
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(new URL(ok.calls[0].url).pathname, "/api/v1/webhooks");
  assertEquals(JSON.parse(ok.calls[0].body!), { key: "review/created", url: CALLBACK });

  const gone = mockCtx([{ status: 404, body: errorBody("Not found") }]);
  await reviewCreated.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, gone.ctx);

  const boom = mockCtx([{ status: 500, body: errorBody("boom") }]);
  await assertRejects(
    () => reviewCreated.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, boom.ctx),
    Error,
    "Judge.me 500",
  );

  const none = mockCtx([]);
  await reviewCreated.onUnsubscribe!(
    { params: {}, state: undefined, subscriptionId: "s" },
    none.ctx,
  );
  assertEquals(none.calls.length, 0);
});
