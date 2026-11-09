import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import cardCreated from "../../triggers/card-created.ts";
import cardMoved from "../../triggers/card-moved.ts";
import cardUpdated from "../../triggers/card-updated.ts";
import commentAdded from "../../triggers/comment-added.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

const SECRET = "trello-power-up-secret-0123456789abcdef";
const CALLBACK = "https://w6w.example/triggers/webhooks/sub_1?x=1&y=2";
const STATE = { webhookId: "wh1", callbackUrl: CALLBACK, modelId: "board1" };
const PARAMS = { modelId: "board1", signingSecret: SECRET };

const action = (type: string, data: unknown) =>
  `{ "action": { "id": "act1", "idMemberCreator": "m1", "type": "${type}",
    "date": "2026-11-09T10:00:00.000Z",
    "data": ${JSON.stringify(data)},
    "memberCreator": { "id": "m1", "fullName": "Ada Lovelace" } },
  "model": { "id": "board1" }, "webhook": { "id": "wh1", "idModel": "board1" } }`;

const CARD = { card: { id: "c1", name: "Write the spec" }, board: { id: "b1", name: "Roadmap" } };
const CREATE_BODY = action("createCard", { ...CARD, list: { id: "l1", name: "To do" } });
const MOVE_BODY = action("updateCard", {
  ...CARD,
  listBefore: { id: "l1", name: "To do" },
  listAfter: { id: "l2", name: "Doing" },
});
const EDIT_BODY = action("updateCard", { ...CARD, old: { name: "Spec" } });
const COMMENT_BODY = action("commentCard", { ...CARD, text: "Looks good" });

const sign = (body: string, cb = CALLBACK, key = SECRET) =>
  createHmac("sha1", key).update(body + cb).digest("base64");

function call(
  over: { headers?: Record<string, string>; rawBody?: string | null; method?: string },
) {
  const rawBody = over.rawBody === null ? undefined : over.rawBody ?? CREATE_BODY;
  return {
    method: over.method ?? "POST",
    path: "/triggers/webhooks/sub_1",
    query: {},
    headers: over.headers ?? { "x-trello-webhook": sign(CREATE_BODY) },
    body: JSON.parse(CREATE_BODY),
    ...(rawBody === undefined ? {} : { rawBody }),
  };
}

function ingest(
  raw: ReturnType<typeof call>,
  opts: { state?: unknown; params?: unknown; trigger?: typeof cardCreated } = {},
) {
  const trigger = opts.trigger ?? cardCreated;
  return trigger.handleIngest!(
    {
      raw,
      params: (opts.params === undefined ? PARAMS : opts.params) as never,
      state: (opts.state === undefined ? STATE : opts.state) as never,
      subscriptionId: "sub_1",
    },
    mockCtx().ctx,
  );
}

const signed = (body: string) =>
  call({ rawBody: body, headers: { "x-trello-webhook": sign(body) } });

test("fixture body is non-canonical JSON", () => {
  assert(JSON.stringify(JSON.parse(CREATE_BODY)) !== CREATE_BODY);
});

test("valid signature over body + callback URL emits one card event", async () => {
  assertEquals(evs(await ingest(call({}))), [{
    actionId: "act1",
    type: "createCard",
    date: "2026-11-09T10:00:00.000Z",
    memberId: "m1",
    memberName: "Ada Lovelace",
    boardId: "b1",
    boardName: "Roadmap",
    cardId: "c1",
    cardName: "Write the spec",
    listId: "l1",
    listName: "To do",
    listBeforeId: null,
    listAfterId: null,
    text: null,
  }]);
});

test("a signature over the re-serialised body is refused", async () => {
  const reserialised = sign(JSON.stringify(JSON.parse(CREATE_BODY)));
  await assertRejects(
    () => ingest(call({ headers: { "x-trello-webhook": reserialised } })),
    Error,
    "signature does not match",
  );
});

test("a signature that omits the callback URL is refused", async () => {
  const noUrl = createHmac("sha1", SECRET).update(CREATE_BODY).digest("base64");
  await assertRejects(
    () => ingest(call({ headers: { "x-trello-webhook": noUrl } })),
    Error,
    "signature does not match",
  );
});

test("a signature made for another callback URL is refused", async () => {
  await assertRejects(
    () =>
      ingest(call({
        headers: { "x-trello-webhook": sign(CREATE_BODY, "https://evil.example/hook") },
      })),
    Error,
    "signature does not match",
  );
});

test("one flipped byte in the body is refused", async () => {
  const flipped = CREATE_BODY.replace('"Write the spec"', '"Write the spek"');
  await assertRejects(() => ingest(call({ rawBody: flipped })), Error, "signature does not match");
});

test("a missing signature header is refused", async () => {
  await assertRejects(() => ingest(call({ headers: {} })), Error, "X-Trello-Webhook is missing");
});

test("a signature made with another secret is refused", async () => {
  await assertRejects(
    () =>
      ingest(
        call({ headers: { "x-trello-webhook": sign(CREATE_BODY, CALLBACK, "other-secret") } }),
      ),
    Error,
    "signature does not match",
  );
});

test("an absent rawBody is refused", async () => {
  await assertRejects(() => ingest(call({ rawBody: null })), Error, "raw body");
});

test("an unset or empty signing secret refuses the delivery", async () => {
  for (const params of [{}, { signingSecret: "" }, { signingSecret: 7 }]) {
    await assertRejects(() => ingest(call({ headers: {} }), { params }), Error, "secret");
  }
});

test("a subscription with no recorded callback URL refuses the delivery", async () => {
  await assertRejects(() => ingest(call({}), { state: {} }), Error, "callback URL");
});

test("refusals never echo the secret, the signature or a header value", async () => {
  const bad = "AAAA".repeat(7);
  const err = await assertRejects(() => ingest(call({ headers: { "x-trello-webhook": bad } })));
  assert(!err.message.includes(SECRET) && !err.message.includes(bad));
});

test("Trello's HEAD probe is acknowledged with no events", async () => {
  assertEquals(evs(await ingest(call({ method: "HEAD", rawBody: null, headers: {} }))), []);
  assertEquals(
    evs(await ingest(call({ method: "GET", rawBody: null, headers: {} }), { state: {} })),
    [],
  );
});

test("a signed delivery for another webhook is refused", async () => {
  const other = CREATE_BODY.replace('"id": "wh1"', '"id": "wh9"');
  await assertRejects(() => ingest(signed(other)), Error, "another webhook");
});

test("each trigger accepts only its own actions", async () => {
  const cases: Array<[typeof cardCreated, string, number]> = [
    [cardCreated, CREATE_BODY, 1],
    [cardCreated, MOVE_BODY, 0],
    [cardMoved, MOVE_BODY, 1],
    [cardMoved, EDIT_BODY, 0],
    [cardUpdated, EDIT_BODY, 1],
    [cardUpdated, MOVE_BODY, 0],
    [cardUpdated, CREATE_BODY, 0],
    [commentAdded, COMMENT_BODY, 1],
    [commentAdded, EDIT_BODY, 0],
  ];
  for (const [trigger, body, n] of cases) {
    assertEquals(
      evs(await ingest(signed(body), { trigger })).length,
      n,
      `${trigger.key} ${body.slice(0, 40)}`,
    );
  }
  const moved = evs(await ingest(signed(MOVE_BODY), { trigger: cardMoved }))[0] as Record<
    string,
    unknown
  >;
  assertEquals([moved.listBeforeId, moved.listAfterId], ["l1", "l2"]);
  const comment = evs(await ingest(signed(COMMENT_BODY), { trigger: commentAdded }))[0] as Record<
    string,
    unknown
  >;
  assertEquals(comment.text, "Looks good");
});

test("onSubscribe registers the callback URL on the model and records it", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "wh1", idModel: "board1" } }]);
  const state = await cardCreated.onSubscribe!(
    {
      params: PARAMS,
      subscriptionId: "sub_1",
      callbackUrl: CALLBACK,
      hostUrl: "https://w6w.example",
    },
    ctx,
  );
  assertEquals(state, STATE);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(`${url.origin}${url.pathname}`, "https://api.trello.com/1/webhooks");
  assertEquals(Object.fromEntries(url.searchParams), {
    callbackURL: CALLBACK,
    idModel: "board1",
    description: "w6w sub_1",
  });
});

test("onSubscribe refuses a missing model or secret before any request", async () => {
  const { ctx, calls } = mockCtx();
  for (
    const params of [{ signingSecret: SECRET }, { modelId: "b" }, {
      modelId: "b",
      signingSecret: "",
    }]
  ) {
    await assertRejects(() =>
      cardCreated.onSubscribe!(
        { params, subscriptionId: "s", callbackUrl: CALLBACK, hostUrl: "h" },
        ctx,
      )
    );
  }
  assertEquals(calls.length, 0);
});

test("onUnsubscribe deletes the webhook; 404 and 410 mean already gone", async () => {
  for (const status of [200, 404, 410]) {
    const { ctx, calls } = mockCtx([{ status, body: {} }]);
    await cardCreated.onUnsubscribe!(
      { params: PARAMS, state: STATE as never, subscriptionId: "s" },
      ctx,
    );
    assertEquals(calls.length, 1);
    assertEquals(calls[0].method, "DELETE");
    assertEquals(new URL(calls[0].url).pathname, "/1/webhooks/wh1");
  }
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  await assertRejects(
    () =>
      cardCreated.onUnsubscribe!(
        { params: PARAMS, state: STATE as never, subscriptionId: "s" },
        ctx,
      ),
    Error,
    "Trello 500",
  );
});

test("onUnsubscribe with no stored webhook makes no request", async () => {
  const { ctx, calls } = mockCtx();
  await cardCreated.onUnsubscribe!(
    { params: PARAMS, state: {} as never, subscriptionId: "s" },
    ctx,
  );
  assertEquals(calls.length, 0);
});
