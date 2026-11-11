import { test } from "node:test";
import { createHmac } from "node:crypto";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import cardDeleted from "../../triggers/card-deleted.ts";
import commentUpdated from "../../triggers/comment-updated.ts";
import listCreated from "../../triggers/list-created.ts";
import listUpdated from "../../triggers/list-updated.ts";
import boardUpdated from "../../triggers/board-updated.ts";
import boardMemberAdded from "../../triggers/board-member-added.ts";
import cardMemberAdded from "../../triggers/card-member-added.ts";
import checklistAdded from "../../triggers/checklist-added.ts";
import checkItemCreated from "../../triggers/check-item-created.ts";
import checkItemStateUpdated from "../../triggers/check-item-state-updated.ts";
import labelAddedToCard from "../../triggers/label-added-to-card.ts";
import labelRemovedFromCard from "../../triggers/label-removed-from-card.ts";
import labelCreated from "../../triggers/label-created.ts";
import labelUpdated from "../../triggers/label-updated.ts";
import labelDeleted from "../../triggers/label-deleted.ts";
import anyEvent from "../../triggers/any-event.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

const SECRET = "test-secret";
const CALLBACK = "https://w6w.example/triggers/webhooks/sub_1?x=1&y=2";
const STATE = { webhookId: "wh1", callbackUrl: CALLBACK, modelId: "board1" };
const PARAMS = { modelId: "board1", signingSecret: SECRET };

/** A delivery with non-canonical whitespace: JSON.stringify(JSON.parse(b)) !== b. */
const action = (type: string, data: unknown, member?: unknown) =>
  `{ "action": { "id": "act1", "idMemberCreator": "m1", "type": "${type}",
    "date": "2026-11-10T10:00:00.000Z",
    "data": ${JSON.stringify(data)},
    ${member ? `"member": ${JSON.stringify(member)},` : ""}
    "memberCreator": { "id": "m1", "fullName": "Ada Lovelace" } },
  "model": { "id": "board1" }, "webhook": { "id": "wh1", "idModel": "board1" } }`;

// Trello signs the raw body followed by the callback URL (sha1, base64).
const sign = (body: string, cb = CALLBACK, key = SECRET) =>
  createHmac("sha1", key).update(body + cb).digest("base64");

function call(
  body: string,
  over: { headers?: Record<string, string>; rawBody?: string | null; method?: string },
) {
  const rawBody = over.rawBody === null ? undefined : over.rawBody ?? body;
  return {
    method: over.method ?? "POST",
    path: "/triggers/webhooks/sub_1",
    query: {},
    headers: over.headers ?? { "x-trello-webhook": sign(body) },
    body: JSON.parse(body),
    ...(rawBody === undefined ? {} : { rawBody }),
  };
}

type Trig = typeof cardDeleted;
const ingest = (
  t: Trig,
  raw: ReturnType<typeof call>,
  opts: { state?: unknown; params?: unknown } = {},
) =>
  t.handleIngest!(
    {
      raw,
      params: (opts.params === undefined ? PARAMS : opts.params) as never,
      state: (opts.state === undefined ? STATE : opts.state) as never,
      subscriptionId: "sub_1",
    },
    mockCtx().ctx,
  );

const B = { board: { id: "b1", name: "Roadmap" } };
const C = { card: { id: "c1", name: "Write the spec" }, ...B };
const NAMED: Array<[Trig, string, string, unknown, unknown?]> = [
  [cardDeleted, "card-deleted", "deleteCard", { ...C, list: { id: "l1", name: "To do" } }],
  [commentUpdated, "comment-updated", "updateComment", {
    ...C,
    action: { id: "a1", text: "new" },
    old: { text: "old" },
  }],
  [listCreated, "list-created", "createList", { ...B, list: { id: "l1", name: "Doing" } }],
  [listUpdated, "list-updated", "updateList", {
    ...B,
    list: { id: "l1", name: "Done" },
    old: { name: "Doing" },
  }],
  [boardUpdated, "board-updated", "updateBoard", { ...B, old: { name: "Plan" } }],
  [boardMemberAdded, "board-member-added", "addMemberToBoard", { ...B, idMember: "m2" }, {
    id: "m2",
    fullName: "Grace Hopper",
  }],
  [cardMemberAdded, "card-member-added", "addMemberToCard", { ...C, idMember: "m2" }, {
    id: "m2",
    fullName: "Grace Hopper",
  }],
  [checklistAdded, "checklist-added", "addChecklistToCard", {
    ...C,
    checklist: { id: "cl1", name: "Launch" },
  }],
  [checkItemCreated, "check-item-created", "createCheckItem", {
    ...C,
    checklist: { id: "cl1", name: "Launch" },
    checkItem: { id: "ci1", name: "Ship", state: "incomplete" },
  }],
  [checkItemStateUpdated, "check-item-state-updated", "updateCheckItemStateOnCard", {
    ...C,
    checkItem: { id: "ci1", name: "Ship", state: "complete" },
  }],
  [labelAddedToCard, "label-added-to-card", "addLabelToCard", {
    ...C,
    label: { id: "lb1", name: "Urgent", color: "red" },
  }],
  [labelRemovedFromCard, "label-removed-from-card", "removeLabelFromCard", {
    ...C,
    label: { id: "lb1", name: "Urgent", color: "red" },
  }],
  [labelCreated, "label-created", "createLabel", {
    ...B,
    label: { id: "lb1", name: "Urgent", color: "red" },
  }],
  [labelUpdated, "label-updated", "updateLabel", {
    ...B,
    label: { id: "lb1", name: "Urgent", color: "orange" },
  }],
  [labelDeleted, "label-deleted", "deleteLabel", { ...B, label: { id: "lb1" } }],
];

for (const [trigger, key, type, data, member] of NAMED) {
  const body = action(type, data, member);

  test(`${key}: declares its key, output and a sample of its own action; fixture is non-canonical`, () => {
    assertEquals(trigger.key, key);
    assertEquals((trigger.output ?? []).length > 0, true);
    assertEquals((trigger.sample as { type: string }).type, type);
    assertEquals(JSON.stringify(JSON.parse(body)) !== body, true);
  });

  test(`${key}: a valid X-Trello-Webhook signature emits the action with its data`, async () => {
    const out = evs(await ingest(trigger, call(body, {}))) as Array<Record<string, unknown>>;
    assertEquals(out.length, 1);
    assertEquals(out[0].type, type);
    assertEquals(out[0].actionId, "act1");
    assertEquals(out[0].data, data);
    assertEquals(out[0].memberName, "Ada Lovelace");
    assertEquals(out[0].targetMemberId, member ? "m2" : null);
  });

  test(`${key}: one flipped byte, a re-serialised body, another secret or another URL is refused`, async () => {
    const flipped = body.replace('"id": "act1"', '"id": "act2"');
    assertEquals(flipped !== body, true);
    await assertRejects(
      () => ingest(trigger, call(body, { rawBody: flipped })),
      Error,
      "signature does not match",
    );
    const reserialised = sign(JSON.stringify(JSON.parse(body)));
    await assertRejects(
      () => ingest(trigger, call(body, { headers: { "x-trello-webhook": reserialised } })),
      Error,
      "signature does not match",
    );
    await assertRejects(
      () =>
        ingest(
          trigger,
          call(body, { headers: { "x-trello-webhook": sign(body, CALLBACK, "other") } }),
        ),
      Error,
      "signature does not match",
    );
    await assertRejects(
      () =>
        ingest(
          trigger,
          call(body, { headers: { "x-trello-webhook": sign(body, "https://evil.example/") } }),
        ),
      Error,
      "signature does not match",
    );
  });

  test(`${key}: a missing header or an absent rawBody is refused`, async () => {
    await assertRejects(
      () => ingest(trigger, call(body, { headers: {} })),
      Error,
      "X-Trello-Webhook is missing",
    );
    await assertRejects(() => ingest(trigger, call(body, { rawBody: null })), Error, "raw body");
  });

  test(`${key}: an unset or empty secret is refused before any compare`, async () => {
    for (const params of [{ modelId: "board1" }, { ...PARAMS, signingSecret: "" }, null]) {
      await assertRejects(
        () => ingest(trigger, call(body, { headers: {} }), { params }),
        Error,
        "secret",
      );
    }
  });

  test(`${key}: another action type is acknowledged and dropped`, async () => {
    const other = action("createCard", { ...C, list: { id: "l1" } });
    assertEquals(evs(await ingest(trigger, call(other, {}))), []);
  });
}

test("a signed delivery for another webhook is refused by an event trigger", async () => {
  const body = action("deleteCard", C).replace('"id": "wh1"', '"id": "wh9"');
  await assertRejects(() => ingest(cardDeleted, call(body, {})), Error, "another webhook");
});

test("onSubscribe registers the callback URL on the model for an event trigger", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "wh1", idModel: "board1" } }]);
  const state = await labelCreated.onSubscribe!(
    { params: PARAMS, subscriptionId: "sub_1", callbackUrl: CALLBACK, hostUrl: "h" },
    ctx,
  );
  assertEquals(state, STATE);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(`${url.origin}${url.pathname}`, "https://api.trello.com/1/webhooks");
  assertEquals(Object.fromEntries(url.searchParams), {
    callbackURL: CALLBACK,
    idModel: "board1",
    description: "w6w sub_1",
  });
});

// ---- Any event ---------------------------------------------------------------------------------

test("any-event: a blank list delivers every action type", async () => {
  for (const events of [undefined, "", " , "]) {
    const params = { ...PARAMS, ...(events === undefined ? {} : { events }) };
    for (const [type, data] of [["createList", { ...B, list: { id: "l1" } }], ["updateCard", C]]) {
      const out = evs(await ingest(anyEvent, call(action(type as string, data), {}), { params }));
      assertEquals((out as Array<{ type: string }>).map((e) => e.type), [type]);
    }
  }
});

test("any-event: the events filter keeps only the listed action types", async () => {
  const params = { ...PARAMS, events: " createList , updateBoard,createList" };
  const hit = evs(
    await ingest(anyEvent, call(action("updateBoard", { ...B, old: { name: "Plan" } }), {}), {
      params,
    }),
  ) as Array<Record<string, unknown>>;
  assertEquals(hit.length, 1);
  assertEquals(hit[0].type, "updateBoard");
  assertEquals(evs(await ingest(anyEvent, call(action("updateCard", C), {}), { params })), []);
});

test("any-event: a malformed action type is refused at subscribe, before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () =>
      anyEvent.onSubscribe!(
        {
          params: { ...PARAMS, events: "createList,update card" },
          subscriptionId: "s",
          callbackUrl: CALLBACK,
          hostUrl: "h",
        },
        ctx,
      ),
    Error,
    "update card",
  );
  assertEquals(calls.length, 0);
});

test("any-event: refuses an unsigned, tampered, bodiless or secret-less delivery", async () => {
  const body = action("createList", { ...B, list: { id: "l1" } });
  await assertRejects(
    () => ingest(anyEvent, call(body, { headers: {} })),
    Error,
    "X-Trello-Webhook",
  );
  await assertRejects(
    () => ingest(anyEvent, call(body, { rawBody: body.replace("act1", "act2") })),
    Error,
    "signature does not match",
  );
  await assertRejects(() => ingest(anyEvent, call(body, { rawBody: null })), Error, "raw body");
  await assertRejects(
    () => ingest(anyEvent, call(body, {}), { params: { modelId: "board1" } }),
    Error,
    "secret",
  );
});

test("any-event: HEAD and GET probes are acknowledged with no events", async () => {
  for (const method of ["HEAD", "GET"]) {
    assertEquals(
      evs(await ingest(anyEvent, call("{}", { method, rawBody: null, headers: {} }))),
      [],
    );
  }
});
