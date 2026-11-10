import { test } from "node:test";
import { createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newPost from "../../triggers/new-post.ts";
import postEdited from "../../triggers/post-edited.ts";
import postRemoved from "../../triggers/post-removed.ts";
import commentEdited from "../../triggers/comment-edited.ts";
import commentRemoved from "../../triggers/comment-removed.ts";
import newPhoto from "../../triggers/new-photo.ts";
import newVideo from "../../triggers/new-video.ts";
import anyEvent from "../../triggers/any-event.ts";
import newPage from "../../triggers/new-page.ts";
import newAdCampaign from "../../triggers/new-ad-campaign.ts";
import { wantedFields } from "../../lib/triggers.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const SECRET = "app-secret-value-0123456789";
const VERIFY = "my-verify-token-4242";
const PARAMS = { appSecret: SECRET, verifyToken: VERIFY };
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

// Independent of app code: node:crypto, `sha256=` + hex HMAC-SHA256 over the exact body bytes
// (https://developers.facebook.com/docs/graph-api/webhooks/getting-started, 2026-11-10).
const sign = (body: string, key = SECRET) =>
  "sha256=" + createHmac("sha256", key).update(body).digest("hex");
const flip = (sig: string) => sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");

const change = (field: string, value: string) => `{ "field": "${field}", "value": ${value} }`;
const delivery = (...changes: string[]) =>
  `{ "object" : "page",
  "entry": [ { "id": "104059235640000", "time": 1731139200, "changes": [ ${
    changes.join(",\n    ")
  } ] } ] }`;

const status = (verb: string) =>
  change(
    "feed",
    `{ "item": "status", "verb": "${verb}", "post_id": "104059235640000_9", "message": "Hi",  "created_time": 1731139200 }`,
  );
const comment = (verb: string) =>
  change(
    "feed",
    `{ "item": "comment", "verb": "${verb}", "post_id": "104059235640000_9", "comment_id": "9_10", "message": "Yo",  "created_time": 1731139200 }`,
  );

const cases = [
  {
    t: newPost,
    body: delivery(status("add")),
    decoy: delivery(status("edited")),
    field: "postId",
    expect: "104059235640000_9",
  },
  {
    t: postEdited,
    body: delivery(status("edited")),
    decoy: delivery(status("add")),
    field: "postId",
    expect: "104059235640000_9",
  },
  {
    t: postRemoved,
    body: delivery(status("remove")),
    decoy: delivery(status("add")),
    field: "postId",
    expect: "104059235640000_9",
  },
  {
    t: commentEdited,
    body: delivery(comment("edited")),
    decoy: delivery(comment("add")),
    field: "commentId",
    expect: "9_10",
  },
  {
    t: commentRemoved,
    body: delivery(comment("remove")),
    decoy: delivery(comment("add")),
    field: "commentId",
    expect: "9_10",
  },
  {
    t: newPhoto,
    body: delivery(
      change(
        "feed",
        `{ "item": "photo", "verb": "add", "post_id": "104059235640000_11", "photo_id": "11",  "created_time": 1731139200 }`,
      ),
    ),
    decoy: delivery(
      change("feed", `{ "item": "video", "verb": "add", "post_id": "104059235640000_12" }`),
    ),
    field: "postId",
    expect: "104059235640000_11",
  },
  {
    t: newVideo,
    body: delivery(
      change(
        "feed",
        `{ "item": "video", "verb": "add", "post_id": "104059235640000_12",  "created_time": 1731139200 }`,
      ),
    ),
    decoy: delivery(
      change("feed", `{ "item": "photo", "verb": "add", "post_id": "104059235640000_11" }`),
    ),
    field: "postId",
    expect: "104059235640000_12",
  },
];

type Trig = {
  handleIngest?: unknown;
};
const post = (body: string | undefined, signature: string | undefined): TriggerCall => ({
  method: "POST",
  path: "/",
  query: {},
  headers: signature === undefined ? {} : { "x-hub-signature-256": signature },
  body: body === undefined ? null : JSON.parse(body),
  ...(body === undefined ? {} : { rawBody: body }),
});
const ingest = (t: Trig, raw: TriggerCall, params: Record<string, unknown> = PARAMS) =>
  Promise.resolve(
    (t as unknown as { handleIngest: (i: unknown, c: unknown) => unknown }).handleIngest({
      raw,
      params,
      state: { callbackUrl: CALLBACK },
      subscriptionId: "sub_1",
    }, {}),
  );

for (const { t, body, decoy, field, expect } of cases) {
  test(`facebook ${t.key}: signed delivery → one event; decoy dropped; flipped signature byte, changed body byte, missing header/rawBody, unset secret → refused`, async () => {
    assert(JSON.stringify(JSON.parse(body)) !== body);
    const out = evs(await ingest(t, post(body, sign(body)))) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0][field], expect);

    assertEquals(evs(await ingest(t, post(decoy, sign(decoy)))), []);

    await assertRejects(() => ingest(t, post(body, flip(sign(body)))));
    await assertRejects(() => ingest(t, post(body.replace('"object"', '"objecu"'), sign(body))));
    await assertRejects(() => ingest(t, post(body, sign(body, "another-secret"))));
    await assertRejects(() => ingest(t, post(body, undefined)));
    await assertRejects(() => ingest(t, post(undefined, sign(body))));
    for (const appSecret of [undefined, ""]) {
      await assertRejects(() => ingest(t, post(body, undefined), { ...PARAMS, appSecret }));
      await assertRejects(() => ingest(t, post(body, ""), { ...PARAMS, appSecret }));
    }
  });
}

test("facebook: the new triggers answer Meta's one-time GET handshake only with the right verify token", async () => {
  const get = (q: Record<string, string>): TriggerCall => ({
    method: "GET",
    path: "/",
    query: q,
    headers: {},
    body: null,
  });
  for (const t of [newPost, anyEvent]) {
    const ok = await ingest(
      t,
      get({ "hub.mode": "subscribe", "hub.verify_token": VERIFY, "hub.challenge": "12345" }),
    );
    assertEquals((ok as { response: { body: string } }).response.body, "12345");
    await assertRejects(() =>
      ingest(
        t,
        get({ "hub.mode": "subscribe", "hub.verify_token": "wrong", "hub.challenge": "12345" }),
      )
    );
    await assertRejects(() =>
      ingest(
        t,
        get({ "hub.mode": "subscribe", "hub.verify_token": VERIFY, "hub.challenge": "12345" }),
        { ...PARAMS, verifyToken: "" },
      )
    );
  }
});

test("facebook: every new webhook trigger is a manual webhook with secret-typed App Secret and Verify Token", async () => {
  for (const t of [...cases.map((c) => c.t), anyEvent]) {
    const tt = t as unknown as {
      params: Array<{ key: string; type: string; required?: boolean }>;
      output: unknown[];
      sample: unknown;
      onSubscribe: (i: unknown, c: unknown) => unknown;
    };
    assert(tt.output.length > 0 && tt.sample !== undefined);
    for (const k of ["appSecret", "verifyToken"]) {
      const p = tt.params.find((x) => x.key === k);
      assertEquals([p?.type, p?.required], ["secret", true]);
    }
    assertEquals(
      await tt.onSubscribe({
        params: PARAMS,
        subscriptionId: "s",
        callbackUrl: CALLBACK,
        hostUrl: "https://h",
      }, {}),
      { callbackUrl: CALLBACK },
    );
  }
});

// ---- Any event ----------------------------------------------------------------------------------

const MULTI = delivery(
  status("add"),
  change(
    "mention",
    `{ "item": "post", "verb": "add", "post_id": "104059235640000_20", "message": "hi @page",  "from": {"id": "7", "name": "Ann"} }`,
  ),
  change("ratings", `{ "item": "rating", "verb": "add", "comment_id": "30" }`),
);

test("facebook any-event: empty Fields keeps every field; a list keeps only those", async () => {
  const all = evs(await ingest(anyEvent, post(MULTI, sign(MULTI)))) as Array<
    Record<string, unknown>
  >;
  assertEquals(all.map((e) => e.field), ["feed", "mention", "ratings"]);
  assertEquals(all[1].senderName, "Ann");
  const some = evs(
    await ingest(anyEvent, post(MULTI, sign(MULTI)), { ...PARAMS, events: "mention, ratings" }),
  ) as Array<Record<string, unknown>>;
  assertEquals(some.map((e) => e.field), ["mention", "ratings"]);
  assertEquals(
    evs(await ingest(anyEvent, post(MULTI, sign(MULTI)), { ...PARAMS, events: "live_videos" })),
    [],
  );
  assertEquals(wantedFields(""), null);
  await assertRejects(() =>
    ingest(anyEvent, post(MULTI, sign(MULTI)), { ...PARAMS, events: "Bad Field!" })
  );
});

test("facebook any-event: flipped signature byte, missing header/rawBody, unset secret → refused", async () => {
  await assertRejects(() => ingest(anyEvent, post(MULTI, flip(sign(MULTI)))));
  await assertRejects(() => ingest(anyEvent, post(MULTI, undefined)));
  await assertRejects(() => ingest(anyEvent, post(undefined, sign(MULTI))));
  for (const appSecret of [undefined, ""]) {
    await assertRejects(() => ingest(anyEvent, post(MULTI, ""), { ...PARAMS, appSecret }));
  }
});

// ---- Snapshot polls -------------------------------------------------------------------------------

const input = (params: Record<string, unknown>, state: unknown) => ({
  params,
  state,
  subscriptionId: "s",
});
const listing = (data: unknown[], after?: string) => ({
  data,
  paging: after
    ? { cursors: { after }, next: `https://graph.facebook.com/next?after=${after}` }
    : { cursors: { after: "end" } },
});
const q = (url: string) => Object.fromEntries(new URL(url).searchParams);

test("facebook new-page: seeds silently, emits only the new Page WITHOUT its access token, idempotent, follows cursors", async () => {
  const old = {
    id: "p1",
    name: "One",
    category: "Cafe",
    access_token: "page-token-one",
    tasks: ["MANAGE"],
  };
  const fresh = {
    id: "p2",
    name: "Two",
    category: "Shop",
    access_token: "page-token-two",
    tasks: ["MANAGE"],
  };
  const m = mockCtx([{ body: listing([old]) }]);
  const seeded = await newPage.poll!(input({}, {}) as never, m.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState && (seeded.nextState as { seeded: boolean }).seeded, true);
  const u = new URL(m.calls[0].url);
  assertEquals([
    m.calls[0].method,
    u.origin + u.pathname,
    q(m.calls[0].url).limit,
    q(m.calls[0].url).fields,
  ], [
    "GET",
    "https://graph.facebook.com/v23.0/me/accounts",
    "100",
    "id,name,category,access_token,tasks",
  ]);

  const run = () => mockCtx([{ body: listing([old], "cur2") }, { body: listing([fresh]) }]);
  const m2 = run();
  const a = await newPage.poll!(input({}, seeded.nextState) as never, m2.ctx);
  assertEquals(a.events, [{ id: "p2", name: "Two", category: "Shop", tasks: ["MANAGE"] }]);
  assertEquals(JSON.stringify(a).includes("page-token"), false);
  assertEquals(q(m2.calls[1].url).after, "cur2");
  assertEquals(await newPage.poll!(input({}, seeded.nextState) as never, run().ctx), a);
  assertEquals((await newPage.poll!(input({}, a.nextState) as never, run().ctx)).events, []);
});

test("facebook new-ad-campaign: per-account snapshot — literal request, seed, new campaign, requires the account", async () => {
  const params = { adAccountId: "act_1234567890" };
  const old = { id: "c1", name: "One" };
  const fresh = { id: "c2", name: "Two" };
  const m = mockCtx([{ body: listing([old]) }]);
  const seeded = await newAdCampaign.poll!(input(params, {}) as never, m.ctx);
  assertEquals(seeded.events, []);
  const u = new URL(m.calls[0].url);
  assertEquals(u.origin + u.pathname, "https://graph.facebook.com/v23.0/act_1234567890/campaigns");
  assertEquals([q(m.calls[0].url).limit, q(m.calls[0].url).fields], [
    "100",
    "id,name,status,objective,effective_status,created_time",
  ]);
  const run = () => mockCtx([{ body: listing([fresh, old]) }]);
  const a = await newAdCampaign.poll!(input(params, seeded.nextState) as never, run().ctx);
  assertEquals(a.events, [fresh]);
  assertEquals(await newAdCampaign.poll!(input(params, seeded.nextState) as never, run().ctx), a);
  assertEquals(
    (await newAdCampaign.poll!(input(params, a.nextState) as never, run().ctx)).events,
    [],
  );
  await assertRejects(() => newAdCampaign.poll!(input({}, {}) as never, mockCtx().ctx));
  assertEquals((newAdCampaign.params ?? [])[0].required, true);
});
