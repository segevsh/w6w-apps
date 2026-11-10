import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import formSubmission from "../../triggers/form-submission.ts";
import collectionItemCreated from "../../triggers/collection-item-created.ts";
import collectionItemChanged from "../../triggers/collection-item-changed.ts";
import newOrder from "../../triggers/new-order.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

const SECRET_KEY = "2b4acfd1c5518bf03c73a4889d197d77251353857c22694bf150b9e3402ba15f";
const CLIENT_SECRET = "oauth-app-client-secret-0123456789";
const CALLBACK = "https://w6w.example/triggers/webhooks/sub_1";
const STATE = {
  webhookId: "wh1",
  siteId: "site1",
  triggerType: "collection_item_created",
  secretKey: SECRET_KEY,
};
const API = "https://api.webflow.com/v2";

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const ITEM_BODY = `{ "triggerType": "collection_item_created",
  "payload": { "id": "item1", "collectionId": "col1", "siteId": "site1", "isDraft": false,
    "fieldData": { "name": "Hello", "slug": "hello" } } }`;

const ts = (offsetMs = 0) => String(Date.now() + offsetMs);
const sign = (body: string, timestamp: string, key = SECRET_KEY) =>
  createHmac("sha256", key).update(`${timestamp}:${body}`).digest("hex");

function call(
  body: string,
  over: {
    headers?: Record<string, string>;
    rawBody?: string | null;
    method?: string;
    timestamp?: string;
    key?: string;
  } = {},
) {
  const timestamp = over.timestamp ?? ts();
  const rawBody = over.rawBody === null ? undefined : over.rawBody ?? body;
  return {
    method: over.method ?? "POST",
    path: "/triggers/webhooks/sub_1",
    query: {},
    headers: over.headers ?? {
      "x-webflow-timestamp": timestamp,
      "x-webflow-signature": sign(body, timestamp, over.key),
    },
    body: JSON.parse(body),
    ...(rawBody === undefined ? {} : { rawBody }),
  };
}

function ingest(
  raw: ReturnType<typeof call>,
  opts: { state?: unknown; params?: unknown; trigger?: typeof collectionItemCreated } = {},
) {
  return (opts.trigger ?? collectionItemCreated).handleIngest!(
    {
      raw,
      params: (opts.params === undefined ? { siteId: "site1" } : opts.params) as never,
      state: (opts.state === undefined ? STATE : opts.state) as never,
      subscriptionId: "sub_1",
    },
    mockCtx().ctx,
  );
}

test("fixture body is non-canonical JSON", () => {
  assert(JSON.stringify(JSON.parse(ITEM_BODY)) !== ITEM_BODY);
});

test("valid signature over timestamp:rawBody emits one event", async () => {
  assertEquals(evs(await ingest(call(ITEM_BODY))), [{
    triggerType: "collection_item_created",
    siteId: "site1",
    collectionId: "col1",
    itemId: "item1",
    payload: {
      id: "item1",
      collectionId: "col1",
      siteId: "site1",
      isDraft: false,
      fieldData: { name: "Hello", slug: "hello" },
    },
  }]);
});

test("the OAuth client secret param verifies when the webhook has no secret key of its own", async () => {
  const out = evs(
    await ingest(call(ITEM_BODY, { key: CLIENT_SECRET }), {
      state: { webhookId: "wh1", siteId: "site1" },
      params: { siteId: "site1", signingSecret: CLIENT_SECRET },
    }),
  );
  assertEquals(out.length, 1);
});

test("a signature over the re-serialised body is refused", async () => {
  const t = ts();
  await assertRejects(
    () =>
      ingest(call(ITEM_BODY, {
        headers: {
          "x-webflow-timestamp": t,
          "x-webflow-signature": sign(JSON.stringify(JSON.parse(ITEM_BODY)), t),
        },
      })),
    Error,
    "signature does not match",
  );
});

test("a signature that leaves out the timestamp is refused", async () => {
  const t = ts();
  const bodyOnly = createHmac("sha256", SECRET_KEY).update(ITEM_BODY).digest("hex");
  await assertRejects(
    () =>
      ingest(
        call(ITEM_BODY, { headers: { "x-webflow-timestamp": t, "x-webflow-signature": bodyOnly } }),
      ),
    Error,
    "signature does not match",
  );
});

test("one flipped byte in the body is refused", async () => {
  await assertRejects(
    () => ingest(call(ITEM_BODY, { rawBody: ITEM_BODY.replace('"Hello"', '"Hellp"') })),
    Error,
    "signature does not match",
  );
});

test("a missing signature or timestamp header is refused", async () => {
  const t = ts();
  await assertRejects(
    () => ingest(call(ITEM_BODY, { headers: { "x-webflow-timestamp": t } })),
    Error,
    "x-webflow-signature is missing",
  );
  await assertRejects(
    () => ingest(call(ITEM_BODY, { headers: { "x-webflow-signature": sign(ITEM_BODY, t) } })),
    Error,
    "x-webflow-timestamp",
  );
});

test("a delivery with neither header (a dashboard-made webhook) is refused, not accepted unsigned", async () => {
  await assertRejects(() => ingest(call(ITEM_BODY, { headers: {} })), Error, "missing");
});

test("a signature made with another secret is refused", async () => {
  await assertRejects(
    () => ingest(call(ITEM_BODY, { key: "k".repeat(32) })),
    Error,
    "signature does not match",
  );
});

test("an absent rawBody is refused", async () => {
  await assertRejects(() => ingest(call(ITEM_BODY, { rawBody: null })), Error, "raw body");
});

test("an unset or empty secret refuses the delivery", async () => {
  const none = { state: { webhookId: "wh1", siteId: "site1" } };
  for (
    const o of [none, { ...none, params: { signingSecret: "" } }, { state: { secretKey: "" } }]
  ) {
    await assertRejects(() => ingest(call(ITEM_BODY), o), Error, "secret");
  }
});

test("a stale or future timestamp is refused even when correctly signed", async () => {
  for (const offset of [-6 * 60 * 1000, 6 * 60 * 1000]) {
    const t = ts(offset);
    await assertRejects(
      () => ingest(call(ITEM_BODY, { timestamp: t })),
      Error,
      "five-minute window",
    );
  }
});

test("a timestamp just inside the window is accepted", async () => {
  assertEquals(evs(await ingest(call(ITEM_BODY, { timestamp: ts(-4 * 60 * 1000) }))).length, 1);
});

test("refusals never echo the secret, the signature or a header value", async () => {
  const bad = "ef".repeat(32);
  const err = await assertRejects(() =>
    ingest(
      call(ITEM_BODY, { headers: { "x-webflow-timestamp": ts(), "x-webflow-signature": bad } }),
    )
  );
  assert(!err.message.includes(SECRET_KEY) && !err.message.includes(bad));
});

test("a non-POST delivery is refused", async () => {
  await assertRejects(() => ingest(call(ITEM_BODY, { method: "GET" })), Error, "POST");
});

test("a delivery for another event type, or another collection, is acknowledged and dropped", async () => {
  const changed = ITEM_BODY.replace("collection_item_created", "collection_item_changed");
  assertEquals(evs(await ingest(call(changed))), []);
  assertEquals(
    evs(await ingest(call(ITEM_BODY), { params: { siteId: "site1", collectionId: "other" } })),
    [],
  );
  assertEquals(
    evs(await ingest(call(ITEM_BODY), { params: { siteId: "site1", collectionId: "col1" } }))
      .length,
    1,
  );
});

test("form-submission and new-order normalise their payloads", async () => {
  const form = `{ "triggerType": "form_submission",
    "payload": { "id": "sub1", "name": "Contact", "siteId": "site1", "data": { "Email": "a@b.co" } } }`;
  const t = ts();
  const out = evs(
    await ingest(call(form, { timestamp: t }), { trigger: formSubmission as never }),
  ) as Array<Record<string, unknown>>;
  assertEquals([out[0].triggerType, out[0].itemId, out[0].collectionId], [
    "form_submission",
    "sub1",
    null,
  ]);
  const order =
    `{ "triggerType": "ecomm_new_order", "payload": { "orderId": "SO-1", "status": "unfulfilled" } }`;
  const o = evs(await ingest(call(order), { trigger: newOrder as never })) as Array<
    Record<string, unknown>
  >;
  assertEquals([o[0].triggerType, o[0].itemId, o[0].siteId], ["ecomm_new_order", "SO-1", "site1"]);
});

test("onSubscribe creates the site webhook and keeps its secret key", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "wh1", triggerType: "collection_item_created", secretKey: SECRET_KEY },
  }]);
  const state = await collectionItemCreated.onSubscribe!(
    {
      params: { siteId: "site1" },
      subscriptionId: "sub_1",
      callbackUrl: CALLBACK,
      hostUrl: "https://w6w.example",
    },
    ctx,
  );
  assertEquals(state, STATE);
  assertEquals(calls.length, 1);
  assertEquals([calls[0].method, calls[0].url], ["POST", `${API}/sites/site1/webhooks`]);
  assertEquals(JSON.parse(calls[0].body!), {
    triggerType: "collection_item_created",
    url: CALLBACK,
  });
});

test("form-submission registers an optional form-name filter; the others register their type", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "w", secretKey: SECRET_KEY } }, {
    body: { id: "w", secretKey: SECRET_KEY },
  }]);
  await formSubmission.onSubscribe!(
    {
      params: { siteId: "s", formName: " Contact " },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "h",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    triggerType: "form_submission",
    url: CALLBACK,
    filter: { name: "Contact" },
  });
  await newOrder.onSubscribe!(
    { params: { siteId: "s" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "h" },
    ctx,
  );
  assertEquals(JSON.parse(calls[1].body!).triggerType, "ecomm_new_order");
  const changed = mockCtx([{ body: { id: "w", secretKey: SECRET_KEY } }]);
  await collectionItemChanged.onSubscribe!(
    { params: { siteId: "s" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "h" },
    changed.ctx,
  );
  assertEquals(JSON.parse(changed.calls[0].body!).triggerType, "collection_item_changed");
});

test("onSubscribe accepts a webhook without a secret key when the client secret is set", async () => {
  const { ctx } = mockCtx([{ body: { id: "wh1" } }]);
  const state = await collectionItemCreated.onSubscribe!(
    {
      params: { siteId: "site1", signingSecret: CLIENT_SECRET },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "h",
    },
    ctx,
  );
  assertEquals(state, {
    webhookId: "wh1",
    siteId: "site1",
    triggerType: "collection_item_created",
  });
});

test("onSubscribe undoes the registration when there is nothing to verify with", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "wh1" } }, { status: 204 }]);
  await assertRejects(
    () =>
      collectionItemCreated.onSubscribe!(
        { params: { siteId: "site1" }, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "h" },
        ctx,
      ),
    Error,
    "signing secret",
  );
  assertEquals(calls.map((c) => `${c.method} ${new URL(c.url).pathname}`), [
    "POST /v2/sites/site1/webhooks",
    "DELETE /v2/webhooks/wh1",
  ]);
});

test("onSubscribe without a site is refused before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () =>
      newOrder.onSubscribe!({
        params: {},
        subscriptionId: "s",
        callbackUrl: CALLBACK,
        hostUrl: "h",
      }, ctx),
    Error,
    "Site ID",
  );
  assertEquals(calls.length, 0);
});

test("onUnsubscribe deletes the webhook; 404 and 410 mean already gone", async () => {
  for (const status of [204, 404, 410]) {
    const { ctx, calls } = mockCtx([{ status, body: status === 204 ? undefined : {} }]);
    await collectionItemCreated.onUnsubscribe!({
      params: {},
      state: STATE as never,
      subscriptionId: "s",
    }, ctx);
    assertEquals(calls.length, 1);
    assertEquals([calls[0].method, calls[0].url], ["DELETE", `${API}/webhooks/wh1`]);
  }
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  await assertRejects(
    () =>
      collectionItemCreated.onUnsubscribe!({
        params: {},
        state: STATE as never,
        subscriptionId: "s",
      }, ctx),
    Error,
    "Webflow 500",
  );
});

test("onUnsubscribe with no stored webhook makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await collectionItemCreated.onUnsubscribe!({
    params: {},
    state: {} as never,
    subscriptionId: "s",
  }, ctx);
  assertEquals(calls.length, 0);
});
