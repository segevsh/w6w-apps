import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import anyEvent from "../../triggers/any-event.ts";
import collectionItemDeleted from "../../triggers/collection-item-deleted.ts";
import collectionItemPublished from "../../triggers/collection-item-published.ts";
import collectionItemUnpublished from "../../triggers/collection-item-unpublished.ts";
import commentCreated from "../../triggers/comment-created.ts";
import inventoryChanged from "../../triggers/inventory-changed.ts";
import orderChanged from "../../triggers/order-changed.ts";
import pageCreated from "../../triggers/page-created.ts";
import pageDeleted from "../../triggers/page-deleted.ts";
import pageMetadataUpdated from "../../triggers/page-metadata-updated.ts";
import sitePublish from "../../triggers/site-publish.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const KEY = "test-site-token-secret";
const OTHER_KEY = "test-other-secret";
const CALLBACK = "https://w6w.example/triggers/webhooks/sub_1";
const API = "https://api.webflow.com/v2";

const ts = (offsetMs = 0) => String(Date.now() + offsetMs);
const sign = (body: string, timestamp: string, key = KEY) =>
  createHmac("sha256", key).update(`${timestamp}:${body}`).digest("hex");

/** A delivery body with non-canonical whitespace, built from a vendor-doc payload. */
const bodyOf = (triggerType: string, payload: unknown) =>
  `{ "triggerType": "${triggerType}",\n  "payload": ${JSON.stringify(payload, null, 1)} }`;

function call(
  body: string,
  over: { headers?: Record<string, string>; rawBody?: string | null; timestamp?: string } = {},
) {
  const timestamp = over.timestamp ?? ts();
  const rawBody = over.rawBody === null ? undefined : over.rawBody ?? body;
  return {
    method: "POST",
    path: "/triggers/webhooks/sub_1",
    query: {},
    headers: over.headers ?? {
      "x-webflow-timestamp": timestamp,
      "x-webflow-signature": sign(body, timestamp),
    },
    body: JSON.parse(body),
    ...(rawBody === undefined ? {} : { rawBody }),
  };
}

// Payloads from https://developers.webflow.com/data/reference/webhooks/events/* (2026-11-10).
const CASES = [
  {
    trigger: collectionItemDeleted,
    type: "collection_item_deleted",
    payload: {
      id: "66424365e972c886137a1cf1",
      siteId: "65427cf400e02b306eaa049c",
      collectionId: "664243617fcc8b464b23c4ee",
      fieldData: { name: "Earth", slug: "earth" },
    },
    itemId: "66424365e972c886137a1cf1",
    collectionId: "664243617fcc8b464b23c4ee",
    siteId: "65427cf400e02b306eaa049c",
  },
  {
    trigger: collectionItemPublished,
    type: "collection_item_published",
    payload: {
      id: "66424365e972c886137a1cf1",
      siteId: "65427cf400e02b306eaa049c",
      collectionId: "664243617fcc8b464b23c4ee",
      isDraft: false,
      fieldData: { name: "Anna Gunn", slug: "anna-gunn" },
    },
    itemId: "66424365e972c886137a1cf1",
    collectionId: "664243617fcc8b464b23c4ee",
    siteId: "65427cf400e02b306eaa049c",
  },
  {
    trigger: collectionItemUnpublished,
    type: "collection_item_unpublished",
    payload: {
      id: "66424365e972c886137a1cf1",
      siteId: "65427cf400e02b306eaa049c",
      collectionId: "664243617fcc8b464b23c4ee",
      fieldData: { name: "Anna Gunn", slug: "anna-gunn" },
    },
    itemId: "66424365e972c886137a1cf1",
    collectionId: "664243617fcc8b464b23c4ee",
    siteId: "65427cf400e02b306eaa049c",
  },
  {
    trigger: orderChanged,
    type: "ecomm_order_changed",
    payload: { orderId: "SO-1001", status: "refunded", comment: "gift wrap" },
    itemId: "SO-1001",
    collectionId: null,
    siteId: "site1",
  },
  {
    trigger: inventoryChanged,
    type: "ecomm_inventory_changed",
    payload: { quantity: 100, inventoryType: "finite" },
    itemId: null,
    collectionId: null,
    siteId: "site1",
  },
  {
    trigger: sitePublish,
    type: "site_publish",
    payload: {
      domains: ["heartofgold.webflow.io"],
      publishedBy: { displayName: "Zaphod Beeblebrox" },
      publishScope: "site",
      site: "62749158efef318abc8d5a0f",
      publishTime: "2024-07-26T16:43:20.440Z",
    },
    itemId: null,
    collectionId: null,
    siteId: "site1",
  },
  {
    trigger: pageCreated,
    type: "page_created",
    payload: {
      siteId: "65427cf400e02b306eaa049c",
      pageId: "66a3cfb276641574f5d58311",
      pageTitle: "Heart of Gold Specs",
      createdOn: "2024-07-26T16:32:50.903Z",
    },
    itemId: "66a3cfb276641574f5d58311",
    collectionId: null,
    siteId: "65427cf400e02b306eaa049c",
  },
  {
    trigger: pageMetadataUpdated,
    type: "page_metadata_updated",
    payload: {
      siteId: "65427cf400e02b306eaa049c",
      pageId: "66a3cfb276641574f5d58311",
      pageTitle: "Heart of Gold Specs",
      lastUpdated: "2024-07-26T16:32:50.903Z",
    },
    itemId: "66a3cfb276641574f5d58311",
    collectionId: null,
    siteId: "65427cf400e02b306eaa049c",
  },
  {
    trigger: pageDeleted,
    type: "page_deleted",
    payload: {
      siteId: "65427cf400e02b306eaa049c",
      pageId: "66a3cfb276641574f5d58311",
      pageTitle: "Heart of Gold Specs",
      deletedOn: "2024-07-26T16:32:50.903Z",
    },
    itemId: "66a3cfb276641574f5d58311",
    collectionId: null,
    siteId: "65427cf400e02b306eaa049c",
  },
  {
    trigger: commentCreated,
    type: "comment_created",
    payload: {
      content: "Looks good",
      isResolved: false,
      author: { userId: "6287ec36a841b25637c663df", name: "Ford Prefect" },
      mentionedUsers: [],
    },
    itemId: null,
    collectionId: null,
    siteId: "site1",
  },
] as const;

for (const c of CASES) {
  const t = c.trigger;
  const state = { webhookId: "wh1", siteId: "site1", triggerType: c.type, secretKey: KEY };
  const run = (raw: ReturnType<typeof call>, st: unknown = state) =>
    t.handleIngest!(
      { raw, params: { siteId: "site1" } as never, state: st as never, subscriptionId: "sub_1" },
      mockCtx().ctx,
    );
  const body = bodyOf(c.type, c.payload);

  test(`${t.key}: a signed ${c.type} delivery emits one event; a foreign type is dropped`, async () => {
    assert(JSON.stringify(JSON.parse(body)) !== body, "fixture must be non-canonical");
    assertEquals(evs(await run(call(body))), [{
      triggerType: c.type,
      siteId: c.siteId,
      collectionId: c.collectionId,
      itemId: c.itemId,
      payload: JSON.parse(JSON.stringify(c.payload)),
    }]);
    const other = bodyOf("form_submission", { id: "f1", siteId: "site1" });
    assertEquals(evs(await run(call(other))), []);
  });

  test(`${t.key}: registers exactly ${c.type} on the site (literal POST)`, async () => {
    const { ctx, calls } = mockCtx([{ status: 201, body: { id: "wh1", secretKey: KEY } }]);
    const st = await t.onSubscribe!(
      { params: { siteId: "site1" }, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
      ctx,
    );
    assertEquals(st, state);
    assertEquals([calls[0].method, calls[0].url], ["POST", `${API}/sites/site1/webhooks`]);
    assertEquals(JSON.parse(calls[0].body!), { triggerType: c.type, url: CALLBACK });
  });

  test(`${t.key}: one flipped byte of the SIGNATURE, a bad body byte, a missing header, no rawBody, a stale timestamp and an unset secret are all refused`, async () => {
    const stamp = ts();
    const good = sign(body, stamp);
    const flipped = good.slice(0, -1) + (good.endsWith("0") ? "1" : "0");
    await assertRejects(
      () =>
        run(call(body, {
          timestamp: stamp,
          headers: {
            "x-webflow-timestamp": stamp,
            "x-webflow-signature": flipped,
          },
        })),
      Error,
      "signature does not match",
    );
    await assertRejects(
      () => run(call(body, { timestamp: stamp, rawBody: body.replace("{ ", "{  ") })),
      Error,
      "signature does not match",
    );
    await assertRejects(
      () => run(call(body, { headers: { "x-webflow-timestamp": stamp } })),
      Error,
      "x-webflow-signature is missing",
    );
    await assertRejects(() => run(call(body, { rawBody: null })), Error, "raw body");
    const old = ts(-6 * 60_000);
    await assertRejects(() => run(call(body, { timestamp: old })), Error, "five-minute window");
    for (const secretKey of ["", undefined]) {
      await assertRejects(
        () => run(call(body), { ...state, secretKey }),
        Error,
        "secret",
      );
    }
  });
}

// ---- any-event ----

test("any-event: empty events registers the 14 documented types, one webhook each, keeping each secret", async () => {
  const types = [
    "form_submission",
    "site_publish",
    "page_created",
    "page_metadata_updated",
    "page_deleted",
    "ecomm_new_order",
    "ecomm_order_changed",
    "ecomm_inventory_changed",
    "collection_item_created",
    "collection_item_changed",
    "collection_item_deleted",
    "collection_item_published",
    "collection_item_unpublished",
    "comment_created",
  ];
  const { ctx, calls } = mockCtx(
    types.map((_, i) => ({ status: 201, body: { id: `wh${i}`, secretKey: `test-key-${i}` } })),
  );
  const st = await anyEvent.onSubscribe!(
    { params: { siteId: "site1" }, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "" },
    ctx,
  );
  assertEquals(
    calls.map((x) => [x.method, x.url, JSON.parse(x.body!)]),
    types.map((t) => [
      "POST",
      `${API}/sites/site1/webhooks`,
      { triggerType: t, url: CALLBACK },
    ]),
  );
  assertEquals((st as { webhooks: unknown[] }).webhooks[1], {
    webhookId: "wh1",
    triggerType: "site_publish",
    secretKey: "test-key-1",
  });
  assertEquals((st as { webhooks: unknown[] }).webhooks.length, 14);
});

test("any-event: a chosen events list is registered, deduped; unknown names are refused before any request", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: "a", secretKey: "test-key-a" } },
    { status: 201, body: { id: "b", secretKey: "test-key-b" } },
  ]);
  const st = await anyEvent.onSubscribe!(
    {
      params: { siteId: "site1", events: "site_publish, branch_created,site_publish" },
      subscriptionId: "s",
      callbackUrl: CALLBACK,
      hostUrl: "",
    },
    ctx,
  );
  assertEquals(calls.map((x) => JSON.parse(x.body!).triggerType), [
    "site_publish",
    "branch_created",
  ]);
  assertEquals((st as { webhooks: unknown[] }).webhooks.length, 2);
  const none = mockCtx([]);
  await assertRejects(
    () =>
      anyEvent.onSubscribe!(
        {
          params: { siteId: "site1", events: "page_nope" },
          subscriptionId: "s",
          callbackUrl: CALLBACK,
          hostUrl: "",
        },
        none.ctx,
      ),
    Error,
    "Unknown Webflow event type",
  );
  await assertRejects(
    () =>
      anyEvent.onSubscribe!(
        { params: {}, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "" },
        none.ctx,
      ),
    Error,
    "Site ID",
  );
  assertEquals(none.calls.length, 0);
});

test("any-event: a failure part-way undoes the webhooks already created", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: "a", secretKey: "test-key-a" } },
    { status: 500, body: "boom" },
    { status: 204 },
  ]);
  await assertRejects(
    () =>
      anyEvent.onSubscribe!(
        {
          params: { siteId: "site1", events: "site_publish,page_created" },
          subscriptionId: "s",
          callbackUrl: CALLBACK,
          hostUrl: "",
        },
        ctx,
      ),
    Error,
    "Webflow 500",
  );
  assertEquals(calls.map((x) => [x.method, x.url]), [
    ["POST", `${API}/sites/site1/webhooks`],
    ["POST", `${API}/sites/site1/webhooks`],
    ["DELETE", `${API}/webhooks/a`],
  ]);
});

test("any-event: with no webhook secret and no client secret the registrations are undone", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "a" } }, { status: 204 }]);
  await assertRejects(
    () =>
      anyEvent.onSubscribe!(
        {
          params: { siteId: "site1", events: "site_publish" },
          subscriptionId: "s",
          callbackUrl: CALLBACK,
          hostUrl: "",
        },
        ctx,
      ),
    Error,
    "no signing secret",
  );
  assertEquals(calls.map((x) => x.method), ["POST", "DELETE"]);
});

test("any-event: onUnsubscribe deletes every stored webhook; 404 means gone", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }, { status: 404, body: {} }]);
  await anyEvent.onUnsubscribe!({
    params: {},
    state: {
      siteId: "site1",
      webhooks: [
        { webhookId: "a", triggerType: "site_publish" },
        { webhookId: "b", triggerType: "page_created" },
      ],
    },
    subscriptionId: "s",
  }, ctx);
  assertEquals(calls.map((x) => [x.method, x.url]), [
    ["DELETE", `${API}/webhooks/a`],
    ["DELETE", `${API}/webhooks/b`],
  ]);
  const none = mockCtx([]);
  await anyEvent.onUnsubscribe!({ params: {}, state: undefined, subscriptionId: "s" }, none.ctx);
  assertEquals(none.calls.length, 0);
});

const ANY_STATE = {
  siteId: "site1",
  webhooks: [
    { webhookId: "a", triggerType: "site_publish", secretKey: KEY },
    { webhookId: "b", triggerType: "page_created", secretKey: OTHER_KEY },
  ],
};
const anyRun = (
  raw: ReturnType<typeof call>,
  state: unknown = ANY_STATE,
  params: unknown = { siteId: "site1" },
) =>
  anyEvent.handleIngest!(
    { raw, params: params as never, state: state as never, subscriptionId: "sub_1" },
    mockCtx().ctx,
  );
const SITE_BODY = bodyOf("site_publish", {
  domains: ["a.webflow.io"],
  site: "s1",
  publishTime: "t",
});

test("any-event: a delivery signed with either webhook's key is verified; the event filter drops unregistered types", async () => {
  const out = evs(await anyRun(call(SITE_BODY)));
  assertEquals((out[0] as { triggerType: string; siteId: string }).triggerType, "site_publish");
  assertEquals((out[0] as { siteId: string }).siteId, "site1");
  const page = bodyOf("page_created", { siteId: "site1", pageId: "p1" });
  const stamp = ts();
  const viaOther = call(page, {
    headers: {
      "x-webflow-timestamp": stamp,
      "x-webflow-signature": sign(page, stamp, OTHER_KEY),
    },
  });
  assertEquals((evs(await anyRun(viaOther))[0] as { itemId: string }).itemId, "p1");
  // collection_item_created is not among the registered types: acknowledged and dropped.
  assertEquals(evs(await anyRun(call(bodyOf("collection_item_created", { id: "i" })))), []);
});

test("any-event: flipped signature byte, missing header, no rawBody, stale timestamp, wrong key and unset secrets are refused", async () => {
  const stamp = ts();
  const good = sign(SITE_BODY, stamp);
  const flipped = good.slice(0, -1) + (good.endsWith("0") ? "1" : "0");
  await assertRejects(
    () =>
      anyRun(
        call(SITE_BODY, {
          headers: { "x-webflow-timestamp": stamp, "x-webflow-signature": flipped },
        }),
      ),
    Error,
    "signature does not match",
  );
  await assertRejects(
    () => anyRun(call(SITE_BODY, { headers: { "x-webflow-timestamp": stamp } })),
    Error,
    "x-webflow-signature is missing",
  );
  await assertRejects(() => anyRun(call(SITE_BODY, { rawBody: null })), Error, "raw body");
  await assertRejects(
    () => anyRun(call(SITE_BODY, { timestamp: ts(-6 * 60_000) })),
    Error,
    "five-minute window",
  );
  const stamp2 = ts();
  await assertRejects(
    () =>
      anyRun(
        call(SITE_BODY, {
          headers: {
            "x-webflow-timestamp": stamp2,
            "x-webflow-signature": sign(SITE_BODY, stamp2, "test-unknown-key"),
          },
        }),
      ),
    Error,
    "signature does not match",
  );
  // No stored webhook secret and no client secret: refused before any compare.
  await assertRejects(
    () =>
      anyRun(call(SITE_BODY), {
        siteId: "site1",
        webhooks: [{ webhookId: "a", triggerType: "site_publish" }],
      }),
    Error,
    "secret",
  );
  await assertRejects(
    () => anyRun(call(SITE_BODY), null, { siteId: "site1" }),
    Error,
    "secret",
  );
});

test("any-event: the OAuth client secret verifies webhooks that carry no key of their own", async () => {
  const st = { siteId: "site1", webhooks: [{ webhookId: "a", triggerType: "site_publish" }] };
  const stamp = ts();
  const raw = call(SITE_BODY, {
    headers: {
      "x-webflow-timestamp": stamp,
      "x-webflow-signature": sign(SITE_BODY, stamp, "test-client-secret"),
    },
  });
  assertEquals(
    evs(await anyRun(raw, st, { siteId: "site1", signingSecret: "test-client-secret" })).length,
    1,
  );
});
