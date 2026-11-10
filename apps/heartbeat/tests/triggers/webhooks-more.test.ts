import { test } from "node:test";
import nodeAssert from "node:assert/strict";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import mention from "../../triggers/mention.ts";
import directMessage from "../../triggers/direct-message.ts";
import abandonedInvitation from "../../triggers/abandoned-invitation.ts";
import anyEvent from "../../triggers/any-event.ts";

// Heartbeat signs nothing (https://heartbeat.readme.io/reference/webhooks documents no signature,
// secret or header), so these triggers have no signature to verify: the callback URL is the secret.
// What they DO enforce is the method, a JSON-object body, and (Any Event) a registered action.

async function assertRejects(fn: () => Promise<unknown>, includes: string) {
  await nodeAssert.rejects(fn, (e: unknown) => e instanceof Error && e.message.includes(includes));
}

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";
const UUID = "e6ccb009-ad46-4b09-a6e9-1412d9ff0601";
const sub = (params: Record<string, unknown>) => ({
  params,
  subscriptionId: "sub_1",
  callbackUrl: CALLBACK,
  hostUrl: "",
});
const call = (
  body: unknown,
  state: unknown,
  opts: { method?: string; query?: Record<string, string>; rawBody?: string } = {},
) => ({
  raw: {
    method: opts.method ?? "POST",
    path: "/",
    query: opts.query ?? {},
    headers: {} as Record<string, string>,
    body,
    ...(opts.rawBody === undefined ? {} : { rawBody: opts.rawBody }),
  },
  params: {},
  state,
  subscriptionId: "sub_1",
});

const cases = [
  {
    t: mention,
    action: "MENTION",
    params: { mentionedId: " u-1 ", mentionedType: "GROUP", channelIds: "c-1, c-2 ," },
    body: {
      action: {
        name: "MENTION",
        filter: { userSelection: [{ id: "u-1", type: "GROUP" }], channelIDs: ["c-1", "c-2"] },
      },
      url: CALLBACK,
    },
    payload: {
      mentionedUsers: [{ id: "u-1", type: "GROUP" }],
      userID: UUID,
      source: { type: "THREAD", channelID: "c-1", threadID: "t-1" },
    },
  },
  {
    t: directMessage,
    action: "DIRECT_MESSAGE",
    params: { userId: " admin-1 " },
    body: { action: { name: "DIRECT_MESSAGE", filter: { userID: "admin-1" } }, url: CALLBACK },
    payload: {
      senderUserID: UUID,
      receiverUserID: "admin-1",
      chatID: "ch-1",
      chatMessageID: "m-1",
    },
  },
  {
    t: abandonedInvitation,
    action: "ABANDONED_CART",
    params: { invitationLinkId: "link-1", groupIds: "g-1,g-2" },
    body: {
      action: {
        name: "ABANDONED_CART",
        filter: { invitationLinkID: "link-1", groupIDs: ["g-1", "g-2"] },
      },
      url: CALLBACK,
    },
    payload: { email: "ada@example.com", invitationLinkID: "link-1", groupIDs: ["g-1", "g-2"] },
  },
];

for (const { t, action, params, body, payload } of cases) {
  test(`${action}: declares output and sample, no poll, hooks present`, () => {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals((t.sample as { action: string }).action, action);
    assertEquals(t.poll, undefined);
    assertEquals(typeof t.onSubscribe, "function");
    assertEquals(typeof t.onUnsubscribe, "function");
  });

  test(`${action}: onSubscribe PUTs the documented action + filter body and keeps the id`, async () => {
    const { ctx, calls } = mockCtx([{ body: { id: UUID } }]);
    const state = await t.onSubscribe!(sub(params), ctx);
    assertEquals(state, { webhookId: UUID });
    assertEquals(calls.length, 1);
    assertEquals(calls[0].method, "PUT");
    assertEquals(new URL(calls[0].url).pathname, "/v0/webhooks");
    assertEquals(JSON.parse(calls[0].body!), body);
  });

  test(`${action}: a delivery with non-canonical whitespace becomes one event beside the action`, async () => {
    const rawBody = JSON.stringify(payload, null, 3);
    assert(JSON.stringify(JSON.parse(rawBody)) !== rawBody);
    const out = evs(await t.handleIngest!(call(rawBody, { webhookId: UUID }), mockCtx().ctx));
    assertEquals(out, [{ action, ...payload }]);
  });

  test(`${action}: a non-POST, a non-JSON body and a non-object body are refused`, async () => {
    const state = { webhookId: UUID };
    await assertRejects(
      async () => await t.handleIngest!(call(payload, state, { method: "GET" }), mockCtx().ctx),
      "POST",
    );
    await assertRejects(
      async () => await t.handleIngest!(call("not json", state), mockCtx().ctx),
      "not JSON",
    );
    await assertRejects(
      async () => await t.handleIngest!(call([1, 2], state), mockCtx().ctx),
      "JSON object",
    );
  });

  test(`${action}: onUnsubscribe DELETEs /webhooks/{id}`, async () => {
    const { ctx, calls } = mockCtx([{ body: {} }]);
    await t.onUnsubscribe!({ params, state: { webhookId: UUID }, subscriptionId: "s" }, ctx);
    assertEquals(calls[0].method, "DELETE");
    assertEquals(new URL(calls[0].url).pathname, `/v0/webhooks/${UUID}`);
  });
}

test("MENTION defaults the type to USER and omits channelIDs when none are listed", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: UUID } }]);
  await mention.onSubscribe!(sub({ mentionedId: "u-9" }), ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    action: { name: "MENTION", filter: { userSelection: [{ id: "u-9", type: "USER" }] } },
    url: CALLBACK,
  });
});

test("MENTION and DIRECT_MESSAGE refuse a missing required filter before any request", async () => {
  for (
    const [t, label] of [[mention, "member or group"], [directMessage, "admin user"]] as const
  ) {
    const { ctx, calls } = mockCtx([]);
    await assertRejects(async () => await t.onSubscribe!(sub({}), ctx), label);
    assertEquals(calls.length, 0);
  }
});

test("ABANDONED_CART with no filters registers the action bare", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: UUID } }]);
  await abandonedInvitation.onSubscribe!(sub({}), ctx);
  assertEquals(JSON.parse(calls[0].body!), { action: { name: "ABANDONED_CART" }, url: CALLBACK });
});

// ---- Any Event ---------------------------------------------------------------------------

const BARE = [
  "USER_JOIN",
  "USER_UPDATE",
  "EVENT_CREATE",
  "EVENT_RSVP",
  "DOCUMENT_CREATE",
  "ABANDONED_CART",
];

test("Any Event declares output and sample and key any-event", () => {
  assertEquals(anyEvent.key, "any-event");
  assert(anyEvent.output!.length > 0);
  assert(anyEvent.sample !== undefined);
  assertEquals(anyEvent.poll, undefined);
});

test("Any Event with no events registers every filterless action, each on ?hbEvent=<ACTION>", async () => {
  const { ctx, calls } = mockCtx(BARE.map((_, i) => ({ body: { id: `wh-${i}` } })));
  const state = await anyEvent.onSubscribe!(sub({}), ctx);
  assertEquals(state, { webhookIds: BARE.map((_, i) => `wh-${i}`), events: BARE });
  assertEquals(calls.length, 6);
  calls.forEach((c, i) => {
    assertEquals(c.method, "PUT");
    assertEquals(new URL(c.url).pathname, "/v0/webhooks");
    assertEquals(JSON.parse(c.body!), {
      action: { name: BARE[i] },
      url: `${CALLBACK}?hbEvent=${BARE[i]}`,
    });
  });
});

test("Any Event with a listed subset registers exactly those, normalising case and duplicates", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "wh-a" } }, { body: { id: "wh-b" } }]);
  const state = await anyEvent.onSubscribe!(
    sub({ events: " user_join, THREAD_CREATE ,USER_JOIN", channelId: "c-1" }),
    ctx,
  );
  assertEquals(state, { webhookIds: ["wh-a", "wh-b"], events: ["USER_JOIN", "THREAD_CREATE"] });
  assertEquals(calls.map((c) => JSON.parse(c.body!)), [
    { action: { name: "USER_JOIN" }, url: `${CALLBACK}?hbEvent=USER_JOIN` },
    {
      action: { name: "THREAD_CREATE", filter: { channelID: "c-1" } },
      url: `${CALLBACK}?hbEvent=THREAD_CREATE`,
    },
  ]);
});

test("Any Event with no events adds a filtered action when its id field is filled", async () => {
  const { ctx, calls } = mockCtx(
    [...BARE, "GROUP_JOIN"].map((_, i) => ({ body: { id: `w${i}` } })),
  );
  const state = await anyEvent.onSubscribe!(sub({ groupId: "g-1" }), ctx) as { events: string[] };
  assertEquals(state.events, [...BARE, "GROUP_JOIN"]);
  assertEquals(
    JSON.parse(calls[calls.length - 1].body!),
    {
      action: { name: "GROUP_JOIN", filter: { groupID: "g-1" } },
      url: `${CALLBACK}?hbEvent=GROUP_JOIN`,
    },
  );
});

test("Any Event registers DIRECT_MESSAGE and COURSE_COMPLETED with their literal filter keys", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "wh-a" } }, { body: { id: "wh-b" } }]);
  await anyEvent.onSubscribe!(
    sub({ events: "DIRECT_MESSAGE,COURSE_COMPLETED", userId: "admin-1", courseId: "c-1" }),
    ctx,
  );
  assertEquals(calls.map((c) => JSON.parse(c.body!)), [
    {
      action: { name: "DIRECT_MESSAGE", filter: { userID: "admin-1" } },
      url: `${CALLBACK}?hbEvent=DIRECT_MESSAGE`,
    },
    {
      action: { name: "COURSE_COMPLETED", filter: { courseID: "c-1" } },
      url: `${CALLBACK}?hbEvent=COURSE_COMPLETED`,
    },
  ]);
});

test("Any Event: a registration answer without a webhook id is refused", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  await assertRejects(
    async () => await anyEvent.onSubscribe!(sub({ events: "USER_JOIN" }), ctx),
    "did not return a webhook id",
  );
});

test("Any Event: every declared output key is present in the sample (null where the sample event lacks it)", () => {
  const sample = anyEvent.sample as Record<string, unknown>;
  assertEquals(
    anyEvent.output!.map((f) => f.key).filter((k) => !(k in sample)),
    [],
  );
  assertEquals(sample.action, "USER_JOIN");
  assertEquals(typeof sample.id, "string");
});

test("Any Event refuses an unknown event, MENTION, and a filtered event without its id - before any request", async () => {
  for (
    const [params, includes] of [
      [{ events: "NOPE" }, 'Unknown Heartbeat event "NOPE"'],
      [{ events: "MENTION" }, "MENTION has its own trigger"],
      [{ events: "COURSE_COMPLETED" }, "course ID"],
      [{ events: "DIRECT_MESSAGE" }, "admin user ID"],
    ] as const
  ) {
    const { ctx, calls } = mockCtx([]);
    await assertRejects(async () => await anyEvent.onSubscribe!(sub(params), ctx), includes);
    assertEquals(calls.length, 0);
  }
});

test("Any Event removes the webhooks it created when a later registration fails", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "wh-1" } },
    { status: 500, body: { message: "boom" } },
    { body: {} },
  ]);
  await assertRejects(
    async () => await anyEvent.onSubscribe!(sub({ events: "USER_JOIN,USER_UPDATE" }), ctx),
    "500",
  );
  assertEquals(calls.map((c) => c.method), ["PUT", "PUT", "DELETE"]);
  assertEquals(new URL(calls[2].url).pathname, "/v0/webhooks/wh-1");
});

test("Any Event onUnsubscribe deletes every webhook; 404 is gone, another error is raised after all are tried", async () => {
  const state = {
    webhookIds: ["wh-1", "wh-2", "wh-3"],
    events: ["USER_JOIN", "USER_UPDATE", "EVENT_CREATE"],
  };
  const gone = mockCtx([{ body: {} }, { status: 404, body: { message: "Not found" } }, {
    body: {},
  }]);
  await anyEvent.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, gone.ctx);
  assertEquals(gone.calls.map((c) => new URL(c.url).pathname), [
    "/v0/webhooks/wh-1",
    "/v0/webhooks/wh-2",
    "/v0/webhooks/wh-3",
  ]);
  const bad = mockCtx([{ status: 500, body: { message: "boom" } }, { body: {} }, { body: {} }]);
  await assertRejects(
    async () => await anyEvent.onUnsubscribe!({ params: {}, state, subscriptionId: "s" }, bad.ctx),
    "500",
  );
  assertEquals(bad.calls.length, 3);
});

test("Any Event handleIngest takes the action from ?hbEvent and only if this subscription registered it", async () => {
  const state = { webhookIds: ["wh-1"], events: ["USER_JOIN", "EVENT_CREATE"] };
  const payload = { id: UUID, name: "Ada", email: "ada@example.com" };
  const rawBody = JSON.stringify(payload, null, 2);
  const out = evs(
    await anyEvent.handleIngest!(
      call(payload, state, { query: { hbEvent: "USER_JOIN" }, rawBody }),
      mockCtx().ctx,
    ),
  );
  assertEquals(out, [{ action: "USER_JOIN", ...payload }]);

  const other = evs(
    await anyEvent.handleIngest!(
      call({ id: UUID }, state, { query: { hbEvent: "EVENT_CREATE" } }),
      mockCtx().ctx,
    ),
  );
  assertEquals(other, [{ action: "EVENT_CREATE", id: UUID }]);

  for (const query of [{}, { hbEvent: "DOCUMENT_CREATE" }, { hbEvent: "user_join" }]) {
    await assertRejects(
      async () => await anyEvent.handleIngest!(call(payload, state, { query }), mockCtx().ctx),
      "registered",
    );
  }
  await assertRejects(
    async () =>
      await anyEvent.handleIngest!(
        call(payload, state, { query: { hbEvent: "USER_JOIN" }, method: "PUT" }),
        mockCtx().ctx,
      ),
    "POST",
  );
  await assertRejects(
    async () =>
      await anyEvent.handleIngest!(
        call("not json", state, { query: { hbEvent: "USER_JOIN" } }),
        mockCtx().ctx,
      ),
    "not JSON",
  );
});
