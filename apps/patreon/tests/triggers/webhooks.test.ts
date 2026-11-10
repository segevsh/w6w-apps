import { test } from "node:test";
import { createHash, createHmac } from "node:crypto";
import { rejects } from "node:assert/strict";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import newPledge from "../../triggers/new-pledge.ts";
import postPublished from "../../triggers/post-published.ts";
import { hmacMd5Hex, md5 } from "../../lib/triggers.ts";

/** Rejects with an Error whose message contains `includes`. */
const assertRejects = (fn: () => Promise<unknown>, _cls: ErrorConstructor, includes: string) =>
  rejects(fn, (e: unknown) => e instanceof Error && e.message.includes(includes));

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "test-secret-for-patreon-0123456789";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const PLEDGE = `{ "data" : { "id":"mem-1", "type":"member",
  "attributes": { "full_name":"Sample Patron", "patron_status":"active_patron" },
  "relationships": { "campaign": { "data": { "id":"123456", "type":"campaign" } } } },
  "included": [ { "id":"123456", "type":"campaign" } ] }`;
const POST = `{ "data" : { "id":"p-9", "type":"post", "attributes": { "title":"Hi" },
  "relationships": { "campaign": { "data": { "id":"123456", "type":"campaign" } } } } }`;

const sign = (b: string, secret = SECRET) => createHmac("md5", secret).update(b).digest("hex");

const call = (
  b: string,
  event: string,
  over: Record<string, unknown> = {},
  secret: string | null = SECRET,
  headers: Record<string, string> = { "x-patreon-event": event, "x-patreon-signature": sign(b) },
) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers,
    body: JSON.parse(b),
    rawBody: b,
    ...over,
  },
  params: { campaignId: "123456" },
  state: { campaignId: "123456", webhookId: "w1", secret: secret ?? undefined },
  subscriptionId: "sub_1",
});
const ingest = (t: typeof newPledge, input: ReturnType<typeof call>) =>
  t.handleIngest!(input, mockCtx().ctx);

test("md5 and hmacMd5Hex agree with node:crypto, incl. block boundaries and long keys", () => {
  for (const n of [0, 1, 3, 55, 56, 57, 63, 64, 65, 119, 120, 128, 1000]) {
    const data = "a".repeat(n);
    const got = Array.from(
      md5(new TextEncoder().encode(data)),
      (x) => x.toString(16).padStart(2, "0"),
    )
      .join("");
    assertEquals(got, createHash("md5").update(data).digest("hex"));
  }
  for (const k of ["k", SECRET, "x".repeat(64), "y".repeat(65), "z".repeat(300)]) {
    assertEquals(hmacMd5Hex(k, PLEDGE), createHmac("md5", k).update(PLEDGE).digest("hex"));
  }
  assertEquals(
    hmacMd5Hex("Jefe", "what do ya want for nothing?"),
    "750c783e6ab0b503eaa86e310a5db738",
  );
});

test("fixture bodies have non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(PLEDGE)) !== PLEDGE);
  assert(JSON.stringify(JSON.parse(POST)) !== POST);
});

test("app declares both original webhook triggers with output and sample", () => {
  assertEquals(app.triggers.map((t) => t.key).slice(0, 2), ["new-pledge", "post-published"]);
  for (const t of app.triggers.slice(0, 2)) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
  }
});

test("valid signature → one normalized event per trigger", async () => {
  const a = evs(await ingest(newPledge, call(PLEDGE, "members:pledge:create"))) as Array<
    Record<string, unknown>
  >;
  assertEquals(a.length, 1);
  assertEquals(a[0].resourceId, "mem-1");
  assertEquals(a[0].campaignId, "123456");
  assertEquals(a[0].trigger, "members:pledge:create");
  assertEquals((a[0].attributes as Record<string, unknown>).patron_status, "active_patron");
  const b = evs(await ingest(postPublished, call(POST, "posts:publish"))) as Array<
    Record<string, unknown>
  >;
  assertEquals(b[0].resourceId, "p-9");
});

test("another trigger or another campaign is acknowledged with no event", async () => {
  assertEquals(evs(await ingest(newPledge, call(POST, "posts:publish"))), []);
  const other = PLEDGE.replace('"id":"123456"', '"id":"999"');
  assertEquals(evs(await ingest(newPledge, call(other, "members:pledge:create"))), []);
});

test("one flipped byte in the body → refused", async () => {
  await assertRejects(
    () =>
      ingest(
        newPledge,
        call(PLEDGE, "members:pledge:create", { rawBody: PLEDGE.replace("mem-1", "mem-2") }),
      ),
    Error,
    "signature",
  );
});

test("signature made with another secret, or SHA-256 instead of MD5 → refused", async () => {
  const wrong = sign(PLEDGE, "another-secret-value-xxxxxxxx");
  await assertRejects(
    () =>
      ingest(
        newPledge,
        call(PLEDGE, "members:pledge:create", {}, SECRET, { "x-patreon-signature": wrong }),
      ),
    Error,
    "signature",
  );
  const sha = createHmac("sha256", SECRET).update(PLEDGE).digest("hex");
  await assertRejects(
    () =>
      ingest(
        newPledge,
        call(PLEDGE, "members:pledge:create", {}, SECRET, { "x-patreon-signature": sha }),
      ),
    Error,
    "signature",
  );
});

test("header missing → refused", async () => {
  await assertRejects(
    () => ingest(newPledge, call(PLEDGE, "members:pledge:create", {}, SECRET, {})),
    Error,
    "X-Patreon-Signature",
  );
});

test("rawBody absent → refused, even with a correct signature", async () => {
  const c = call(PLEDGE, "members:pledge:create");
  delete (c.raw as { rawBody?: string }).rawBody;
  await assertRejects(() => ingest(newPledge, c), Error, "raw body");
});

test("unset or empty secret + absent or empty header → refused", async () => {
  for (const secret of [null, ""]) {
    for (const headers of [{}, { "x-patreon-signature": "" }]) {
      await assertRejects(
        () => ingest(newPledge, call(PLEDGE, "members:pledge:create", {}, secret, headers)),
        Error,
        "secret",
      );
    }
  }
});

test("errors never contain the secret, the signature or the header value", async () => {
  const sig = sign(PLEDGE, "another-secret-value-xxxxxxxx");
  try {
    await ingest(
      newPledge,
      call(PLEDGE, "members:pledge:create", {}, SECRET, { "x-patreon-signature": sig }),
    );
    assert(false, "must throw");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes(sig));
  }
});

test("a non-POST call is refused", async () => {
  await assertRejects(
    () => ingest(newPledge, call(PLEDGE, "members:pledge:create", { method: "GET" })),
    Error,
    "POST",
  );
});

test("onSubscribe POSTs the literal webhook document and keeps id and secret", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { data: { id: "3955", attributes: { secret: SECRET } } } },
  ]);
  const state = await newPledge.onSubscribe!(
    {
      params: { campaignId: " 123456 " },
      subscriptionId: "sub_1",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    ctx,
  );
  assertEquals(state, { campaignId: "123456", webhookId: "3955", secret: SECRET });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://www.patreon.com/api/oauth2/v2/webhooks");
  assertEquals(JSON.parse(calls[0].body!), {
    data: {
      type: "webhook",
      attributes: { triggers: ["members:pledge:create"], uri: CALLBACK },
      relationships: { campaign: { data: { type: "campaign", id: "123456" } } },
    },
  });
});

test("post-published registers posts:publish", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { data: { id: 7, attributes: { secret: SECRET } } } },
  ]);
  await postPublished.onSubscribe!(
    { params: { campaignId: "1" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).data.attributes.triggers, ["posts:publish"]);
});

test("onSubscribe without a returned secret rolls the webhook back and fails", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { data: { id: "3955", attributes: {} } } }, {
    status: 204,
  }]);
  await assertRejects(
    () =>
      newPledge.onSubscribe!(
        { params: { campaignId: "1" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
        ctx,
      ),
    Error,
    "signing secret",
  );
  assertEquals(calls[1].method, "DELETE");
  assertEquals(calls[1].url, "https://www.patreon.com/api/oauth2/v2/webhooks/3955");
});

test("onSubscribe refuses an empty campaign id", async () => {
  await assertRejects(
    () =>
      newPledge.onSubscribe!(
        { params: { campaignId: " " }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
        mockCtx().ctx,
      ),
    Error,
    "campaign",
  );
});

test("onUnsubscribe DELETEs the webhook; 404 and 410 are already gone; 500 surfaces", async () => {
  const state = { campaignId: "1", webhookId: "3955", secret: SECRET };
  const ok = mockCtx([{ status: 204 }]);
  await newPledge.onUnsubscribe!(
    { params: { campaignId: "1" }, state, subscriptionId: "s" },
    ok.ctx,
  );
  assertEquals(ok.calls[0].method, "DELETE");
  assertEquals(ok.calls[0].url, "https://www.patreon.com/api/oauth2/v2/webhooks/3955");
  for (const status of [404, 410]) {
    const gone = mockCtx([{ status, body: { errors: [{ detail: "not found" }] } }]);
    await newPledge.onUnsubscribe!(
      { params: { campaignId: "1" }, state, subscriptionId: "s" },
      gone.ctx,
    );
  }
  const bad = mockCtx([{ status: 500, body: { errors: [{ detail: "boom" }] } }]);
  await assertRejects(
    () =>
      newPledge.onUnsubscribe!(
        { params: { campaignId: "1" }, state, subscriptionId: "s" },
        bad.ctx,
      ),
    Error,
    "500",
  );
});
