import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { API_ROOT, envelope, errorEnvelope, mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import newLead from "../../triggers/new-lead.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

const SECRET = "test-app-secret";
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Non-canonical whitespace and two 19-digit ids (above 2^53): JSON.stringify(JSON.parse(BODY))
// differs from BODY, and a plain JSON.parse would round the ids.
const BODY =
  `{ "object": 1,\n  "entry": [ { "id": 7000000000000000011, "page_id": 7000000000000000012,
  "page_name": "Spring form", "advertiser_id": 7000000000000000013, "advertiser_name": "Example",
  "library_id": 0, "campaign_id": 1, "campaign_name": "C", "adgroup_id": 2, "adgroup_name": "G",
  "ad_id": 3, "ad_name": "A", "create_time": 1614239152, "lead_source": "INSTANT_FORM",
  "changes": [ {"field": "name", "value": "Jane Doe"}, {"field":"email","value":"jane@example.com"} ] } ],
  "time": 1614334356 }`;

const NOW = 1_700_000_000_000;
const T = NOW / 1000;

const sig = (t: number, body = BODY, key = SECRET) =>
  `t=${t},s=${createHmac("sha256", key).update(`${t}.${body}`).digest("hex")}`;

const call = (over: Record<string, unknown> = {}, body: string | null = BODY) => ({
  raw: {
    method: "POST",
    path: "/",
    query: {},
    headers: { "tiktok-signature": sig(T) } as Record<string, string>,
    body: body === null ? null : JSON.parse(body),
    ...(body === null ? {} : { rawBody: body }),
    ...over,
  },
  params: { appSecret: SECRET } as { appSecret: string | undefined },
  state: { subscriptionId: "sub-1" },
  subscriptionId: "sub_1",
});

// Pin the clock so the 300 s window is measured against NOW.
async function ingest(input: ReturnType<typeof call>) {
  const real = Date.now;
  Date.now = () => NOW;
  try {
    return await newLead.handleIngest!(input as never, mockCtx().ctx);
  } finally {
    Date.now = real;
  }
}

test("fixture body is not byte-identical to its re-serialisation", () => {
  assert(JSON.stringify(JSON.parse(BODY)) !== BODY);
});

test("app declares one webhook trigger with output, sample and a secret param", () => {
  assertEquals(app.triggers.map((t) => t.key), ["new-lead"]);
  const t = app.triggers[0];
  assert(t.output!.length > 0);
  assert(t.sample !== undefined);
  assertEquals(t.poll, undefined);
  assertEquals(typeof t.onSubscribe, "function");
  assertEquals(typeof t.onUnsubscribe, "function");
  assertEquals(t.params!.find((p) => p.key === "appSecret")!.type, "secret");
  assertEquals(t.params!.find((p) => p.key === "appId")!.type, "string");
});

test("valid signature over t.rawBody → one lead event with exact 64-bit ids", async () => {
  const out = evs(await ingest(call())) as Array<Record<string, unknown>>;
  assertEquals(out, [{
    leadId: "7000000000000000011",
    leadSource: "INSTANT_FORM",
    pageId: "7000000000000000012",
    pageName: "Spring form",
    advertiserId: "7000000000000000013",
    advertiserName: "Example",
    libraryId: "0",
    campaignId: "1",
    campaignName: "C",
    adgroupId: "2",
    adgroupName: "G",
    adId: "3",
    adName: "A",
    createTime: 1614239152,
    fields: { name: "Jane Doe", email: "jane@example.com" },
    changes: [
      { field: "name", value: "Jane Doe" },
      { field: "email", value: "jane@example.com" },
    ],
    sentAt: 1614334356,
  }]);
});

test("a batched delivery yields one event per entry; another object type yields none", async () => {
  const two = `{"object":1,"entry":[{"id":1},{"id":2}],"time":5}`;
  const out = evs(
    await ingest(call({ rawBody: two, headers: { "tiktok-signature": sig(T, two) } }, two)),
  ) as Array<{ leadId: string }>;
  assertEquals(out.map((e) => e.leadId), ["1", "2"]);

  const other = `{"object":2,"entry":[{"id":1}]}`;
  assertEquals(
    evs(
      await ingest(call({ rawBody: other, headers: { "tiktok-signature": sig(T, other) } }, other)),
    ),
    [],
  );
});

test("signature over JSON.stringify(body) instead of the raw bytes → refused", async () => {
  const canonical = JSON.stringify(JSON.parse(BODY));
  const h = { "tiktok-signature": sig(T, canonical) };
  await assertRejects(() => ingest(call({ headers: h })), Error, "signature");
});

test("one flipped byte in the body → refused", async () => {
  await assertRejects(
    () => ingest(call({ rawBody: BODY.replace("Jane", "Jame") })),
    Error,
    "signature",
  );
});

test("signature made with another secret → refused", async () => {
  const h = { "tiktok-signature": sig(T, BODY, "another-test-secret") };
  await assertRejects(() => ingest(call({ headers: h })), Error, "signature");
});

test("header missing → refused", async () => {
  await assertRejects(() => ingest(call({ headers: {} })), Error, "TikTok-Signature");
});

test("header name is matched case-insensitively", async () => {
  const h = { "Tiktok-Signature": sig(T) };
  assertEquals((evs(await ingest(call({ headers: h }))) as unknown[]).length, 1);
});

test("malformed header (no t=, no s=, junk, duplicates) → refused", async () => {
  const good = sig(T);
  const s = good.split(",")[1];
  for (
    const bad of [
      s, // no t=
      `t=${T}`, // no s=
      `t=${T},s=`, // empty s
      `t=,${s}`, // empty t
      `t=abc,${s}`, // non-numeric t
      `t=${T},s=zz`, // non-hex s
      `t=${T},t=${T},${s}`, // duplicate t
      `t=${T},${s},${s}`, // duplicate s
      "garbage",
    ]
  ) {
    await assertRejects(
      () => ingest(call({ headers: { "tiktok-signature": bad } })),
      Error,
      "malformed",
    );
  }
});

test("rawBody absent → refused (no re-serialising the parsed body)", async () => {
  await assertRejects(() => ingest(call({ rawBody: undefined })), Error, "raw body");
});

test("unset or empty secret → refused, even against a signature made with an empty key", async () => {
  await assertRejects(
    () => ingest({ ...call(), params: { appSecret: undefined } }),
    Error,
    "secret",
  );
  await assertRejects(() => ingest({ ...call(), params: { appSecret: "" } }), Error, "secret");
});

test("timestamp older than 300 s → refused; 299 s old still accepted", async () => {
  await assertRejects(
    () => ingest(call({ headers: { "tiktok-signature": sig(T - 301) } })),
    Error,
    "timestamp",
  );
  assertEquals(
    (evs(await ingest(call({ headers: { "tiktok-signature": sig(T - 299) } }))) as unknown[])
      .length,
    1,
  );
});

test("timestamp beyond tolerance in the future → refused", async () => {
  await assertRejects(
    () => ingest(call({ headers: { "tiktok-signature": sig(T + 301) } })),
    Error,
    "timestamp",
  );
});

test("a non-POST call → refused", async () => {
  await assertRejects(() => ingest(call({ method: "GET" })), Error, "POST");
});

test("a verified body that is not a JSON object → throws", async () => {
  const bad = "not json";
  await assertRejects(
    () => ingest(call({ rawBody: bad, body: bad, headers: { "tiktok-signature": sig(T, bad) } })),
    Error,
    "JSON",
  );
});

test("refusals never echo the secret, the signature or the header", async () => {
  const header = sig(T, BODY, "another-test-secret");
  try {
    await ingest(call({ headers: { "tiktok-signature": header } }));
    assert(false, "should have thrown");
  } catch (e) {
    const m = (e as Error).message;
    assert(!m.includes(SECRET) && !m.includes(header.split("s=")[1]), m);
  }
});

const PARAMS = {
  appId: "test-app-id",
  appSecret: SECRET,
  accessToken: "test-access-token",
  advertiserId: "1234",
};

test("onSubscribe → POST /subscription/subscribe/ with the literal body; id stored", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ subscription_id: "sub-77" }) }]);
  const state = await newLead.onSubscribe!(
    {
      params: { ...PARAMS, pageId: "55", leadSource: "INSTANT_FORM" },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "https://api.example.test",
    } as never,
    ctx,
  );
  assertEquals(state, { subscriptionId: "sub-77" });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/subscription/subscribe/`);
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    app_id: "test-app-id",
    secret: SECRET,
    subscribe_entity: "LEAD",
    callback_url: CALLBACK,
    subscription_detail: {
      access_token: "test-access-token",
      advertiser_id: "1234",
      page_id: "55",
      lead_source: "INSTANT_FORM",
    },
  });
});

test("onSubscribe with a form library sends library_id, not advertiser_id", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ subscription_id: "sub-78" }) }]);
  await newLead.onSubscribe!(
    {
      params: { ...PARAMS, advertiserId: "", libraryId: "9" },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "",
    } as never,
    ctx,
  );
  const detail = JSON.parse(calls[0].body!).subscription_detail;
  assertEquals(detail, { access_token: "test-access-token", library_id: "9" });
});

test("onSubscribe refuses missing inputs before any request", async () => {
  for (
    const params of [
      { ...PARAMS, appId: "" },
      { ...PARAMS, appSecret: "" },
      { ...PARAMS, accessToken: "" },
      { ...PARAMS, advertiserId: "" },
    ]
  ) {
    const { ctx, calls } = mockCtx([]);
    await assertRejects(() =>
      newLead.onSubscribe!(
        { params, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" } as never,
        ctx,
      )
    );
    assertEquals(calls.length, 0);
  }
});

test("onSubscribe: a TikTok error or a missing subscription_id throws", async () => {
  const bad = mockCtx([{ body: errorEnvelope(40002, "Missing required field(s)") }]);
  await assertRejects(() =>
    newLead.onSubscribe!(
      { params: PARAMS, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" } as never,
      bad.ctx,
    )
  );
  const none = mockCtx([{ body: envelope({}) }]);
  await assertRejects(
    () =>
      newLead.onSubscribe!(
        { params: PARAMS, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" } as never,
        none.ctx,
      ),
    Error,
    "subscription_id",
  );
});

test("onUnsubscribe → POST /subscription/unsubscribe/ with the literal body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ subscription_id: "sub-77" }) }]);
  await newLead.onUnsubscribe!(
    { params: PARAMS, state: { subscriptionId: "sub-77" }, subscriptionId: "s" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/subscription/unsubscribe/`);
  assertEquals(JSON.parse(calls[0].body!), {
    app_id: "test-app-id",
    secret: SECRET,
    subscription_id: "sub-77",
  });
});

test("onUnsubscribe: 404, 410 and 'not found' mean already gone; other errors throw", async () => {
  for (
    const r of [
      { status: 404, body: errorEnvelope(40000, "x") },
      { status: 410, body: errorEnvelope(40000, "x") },
      { status: 404, body: "Not Found" },
      { status: 200, body: errorEnvelope(40000, "Subscription not found") },
    ]
  ) {
    const { ctx } = mockCtx([r]);
    await newLead.onUnsubscribe!(
      { params: PARAMS, state: { subscriptionId: "sub-77" }, subscriptionId: "s" } as never,
      ctx,
    );
  }
  const { ctx } = mockCtx([{
    status: 200,
    body: errorEnvelope(40105, "Access token is incorrect"),
  }]);
  await assertRejects(() =>
    newLead.onUnsubscribe!(
      { params: PARAMS, state: { subscriptionId: "sub-77" }, subscriptionId: "s" } as never,
      ctx,
    )
  );
});

test("onUnsubscribe with no stored id makes no request", async () => {
  const { ctx, calls } = mockCtx([]);
  await newLead.onUnsubscribe!({ params: PARAMS, state: {}, subscriptionId: "s" } as never, ctx);
  assertEquals(calls.length, 0);
});
