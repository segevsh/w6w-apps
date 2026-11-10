import { test } from "node:test";
import { createHmac } from "node:crypto";
import type { TriggerCall } from "@w6w/types";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import anyEvent from "../../triggers/any-event.ts";
import addedToGroup from "../../triggers/subscriber-added-to-group.ts";
import removedFromGroup from "../../triggers/subscriber-removed-from-group.ts";
import bounced from "../../triggers/subscriber-bounced.ts";
import spamReported from "../../triggers/subscriber-spam-reported.ts";
import automationTriggered from "../../triggers/subscriber-automation-triggered.ts";
import automationCompleted from "../../triggers/subscriber-automation-completed.ts";

const SECRET = "test-secret";
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const sign = (body: string, secret = SECRET) =>
  createHmac("sha256", secret).update(body).digest("hex");

// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const flat = (event: string) =>
  `{ "id": "100000000000000000",  "email": "john.doe@example.com",\n  "status": "active", "event": "${event}", "account_id": 0 }`;
const typed = (event: string, key: string, id: string) =>
  `{ "type": "${event}",  "subscriber": { "id": "100000000000000000", "email": "john.doe@example.com" },\n  "${key}": { "id": "${id}", "name": "Example" }, "account_id": 0 }`;

function call(rawBody: string | null, headers: Record<string, string>): TriggerCall {
  const raw: TriggerCall = { method: "POST", path: "/hook", query: {}, headers, body: null };
  if (rawBody !== null) {
    raw.rawBody = rawBody;
    raw.body = JSON.parse(rawBody);
  }
  return raw;
}
type Named = typeof bounced;
const ingest = (t: Named, raw: TriggerCall, params: Record<string, unknown> = {}, state: unknown = {
  webhookId: "w1",
  event: "x",
  secret: SECRET,
}) =>
  t.handleIngest!(
    { raw, params: params as never, state: state as never, subscriptionId: "sub-1" },
    mockCtx().ctx,
  );
const subscribeInput = {
  params: {},
  subscriptionId: "sub-1",
  callbackUrl: "https://w6w.example/hook/abc",
  hostUrl: "",
};
const created = {
  status: 200,
  body: { data: { id: "68074372004316503", secret: SECRET, enabled: true } },
};

// Table: every new fixed-event signed trigger shares one §6 case set.
const named: Array<
  { trigger: Named; key: string; event: string; body: string; resourceId: string }
> = [
  {
    trigger: addedToGroup as Named,
    key: "subscriber-added-to-group",
    event: "subscriber.added_to_group",
    body: typed("subscriber.added_to_group", "group", "g1"),
    resourceId: "100000000000000000",
  },
  {
    trigger: removedFromGroup as Named,
    key: "subscriber-removed-from-group",
    event: "subscriber.removed_from_group",
    body: typed("subscriber.removed_from_group", "group", "g1"),
    resourceId: "100000000000000000",
  },
  {
    trigger: bounced,
    key: "subscriber-bounced",
    event: "subscriber.bounced",
    body: flat("subscriber.bounced"),
    resourceId: "100000000000000000",
  },
  {
    trigger: spamReported,
    key: "subscriber-spam-reported",
    event: "subscriber.spam_reported",
    body: flat("subscriber.spam_reported"),
    resourceId: "100000000000000000",
  },
  {
    trigger: automationTriggered as Named,
    key: "subscriber-automation-triggered",
    event: "subscriber.automation_triggered",
    body: typed("subscriber.automation_triggered", "automation", "a1"),
    resourceId: "100000000000000000",
  },
  {
    trigger: automationCompleted as Named,
    key: "subscriber-automation-completed",
    event: "subscriber.automation_completed",
    body: typed("subscriber.automation_completed", "automation", "a1"),
    resourceId: "100000000000000000",
  },
];

for (const { trigger, key, event, body, resourceId } of named) {
  test(`${key}: declares output, sample, hooks and its key`, () => {
    assert(JSON.stringify(JSON.parse(body)) !== body);
    assertEquals(trigger.key, key);
    assert((trigger.output as unknown[]).length > 0);
    assert(trigger.sample !== undefined);
    assertEquals(trigger.poll, undefined);
    assertEquals(typeof trigger.onSubscribe, "function");
    assertEquals(typeof trigger.handleIngest, "function");
  });

  test(`${key}: a valid signature over the exact bytes yields the event`, async () => {
    const out = evs(await ingest(trigger, call(body, { signature: sign(body) })));
    assertEquals(out, [{ event, resourceId, resource: JSON.parse(body) }]);
  });

  test(`${key}: one flipped byte of the SIGNATURE itself throws without echoing it`, async () => {
    const good = sign(body);
    const bad = (good[0] === "a" ? "b" : "a") + good.slice(1);
    const err = await assertRejects(() => ingest(trigger, call(body, { signature: bad })));
    assert(err.message.includes("refused"));
    assert(!err.message.includes(bad) && !err.message.includes(SECRET));
  });

  test(`${key}: a flipped body byte, a missing header and an absent rawBody throw`, async () => {
    await assertRejects(
      () => ingest(trigger, call(body.replace("john", "joan"), { signature: sign(body) })),
      Error,
      "refused",
    );
    await assertRejects(() => ingest(trigger, call(body, {})), Error, "refused");
    await assertRejects(
      () => ingest(trigger, call(null, { signature: sign(body) })),
      Error,
      "raw body",
    );
  });

  test(`${key}: an unset or empty secret refuses before any compare`, async () => {
    for (const state of [null, {}, { secret: "" }]) {
      for (const headers of [{}, { signature: "" }, { signature: sign(body) }]) {
        await assertRejects(() => ingest(trigger, call(body, headers), {}, state), Error, "secret");
      }
    }
  });

  test(`${key}: another verified event is acknowledged, not emitted`, async () => {
    const other = flat("subscriber.created");
    assertEquals(evs(await ingest(trigger, call(other, { signature: sign(other) }))), []);
  });

  test(`${key}: onSubscribe registers exactly its own event`, async () => {
    const { ctx, calls } = mockCtx([{ body: { data: [], meta: { last_page: 1 } } }, created]);
    await trigger.onSubscribe!(subscribeInput as never, ctx);
    assertEquals(calls[1].method, "POST");
    assertEquals(calls[1].url, "https://connect.mailerlite.com/api/webhooks");
    assertEquals(JSON.parse(calls[1].body!), {
      name: "w6w sub-1",
      events: [event],
      url: "https://w6w.example/hook/abc",
      enabled: true,
    });
  });
}

test("added/removed group triggers fire only for the chosen group id", async () => {
  const body = typed("subscriber.added_to_group", "group", "g1");
  const headers = { signature: sign(body) };
  assertEquals(
    evs(await ingest(addedToGroup as Named, call(body, headers), { groupId: "g1" })).length,
    1,
  );
  assertEquals(
    evs(await ingest(addedToGroup as Named, call(body, headers), { groupId: "g2" })),
    [],
  );
  assertEquals(evs(await ingest(addedToGroup as Named, call(body, headers), {})).length, 1);
  assertEquals((addedToGroup.params ?? []).map((p) => p.key), ["groupId"]);
});

// ---- Any event -----------------------------------------------------------------------------

test("any-event has an events param, output and sample and is wired in the app", () => {
  assertEquals(anyEvent.params!.map((p) => p.key), ["events"]);
  assert((anyEvent.output as unknown[]).length > 0);
  assert(anyEvent.sample !== undefined);
  assert(app.triggers.some((t) => t.key === "any-event"));
});

test("any-event: with no filter every named event is emitted under its own name", async () => {
  for (
    const body of [flat("subscriber.bounced"), typed("subscriber.added_to_group", "group", "g1")]
  ) {
    const out = evs(await ingest(anyEvent as Named, call(body, { signature: sign(body) })));
    assertEquals(out.length, 1);
    assertEquals(
      (out[0] as { event: string }).event,
      JSON.parse(body).event ?? JSON.parse(body).type,
    );
  }
});

test("any-event: the events filter drops the others and an unknown name is refused", async () => {
  const bounce = flat("subscriber.bounced");
  const spam = flat("subscriber.spam_reported");
  const params = { events: "Subscriber.Bounced" };
  assertEquals(
    evs(await ingest(anyEvent as Named, call(bounce, { signature: sign(bounce) }), params)).length,
    1,
  );
  assertEquals(
    evs(await ingest(anyEvent as Named, call(spam, { signature: sign(spam) }), params)),
    [],
  );
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () =>
      anyEvent.onSubscribe!(
        { ...subscribeInput, params: { events: "subscriber.exploded" } } as never,
        ctx,
      ),
    Error,
    "Unknown MailerLite event",
  );
  assertEquals(calls.length, 0);
});

test("any-event: onSubscribe registers the chosen list; all fourteen, batchable, when empty", async () => {
  const one = mockCtx([{ body: { data: [], meta: { last_page: 1 } } }, created]);
  await anyEvent.onSubscribe!(
    { ...subscribeInput, params: { events: "subscriber.bounced, campaign.sent" } } as never,
    one.ctx,
  );
  assertEquals(JSON.parse(one.calls[1].body!), {
    name: "w6w sub-1",
    events: ["subscriber.bounced", "campaign.sent"],
    url: "https://w6w.example/hook/abc",
    enabled: true,
  });
  const all = mockCtx([{ body: { data: [], meta: { last_page: 1 } } }, created]);
  const state = await anyEvent.onSubscribe!(subscribeInput as never, all.ctx);
  const sent = JSON.parse(all.calls[1].body!);
  assertEquals(sent.events.length, 14);
  assertEquals(sent.batchable, true);
  assertEquals((state as { event: string }).event.split(",").length, 14);
});

test("any-event: a batched delivery emits one event per item, each signed as one body", async () => {
  const body =
    `{ "events": [ {"type": "campaign.open", "subscriber": {"id": "s1"}, "campaign": {"id": "c1"}},\n {"type": "campaign.click", "subscriber": {"id": "s2"}, "campaign": {"id": "c1"}}, {"type": "subscriber.bounced", "id": "s3"} ], "total": 3 }`;
  const out = evs(
    await ingest(anyEvent as Named, call(body, { signature: sign(body) }), {
      events: "campaign.open,campaign.click",
    }),
  ) as Array<{ event: string; resourceId: string }>;
  assertEquals(out.map((e) => [e.event, e.resourceId]), [["campaign.open", "s1"], [
    "campaign.click",
    "s2",
  ]]);
  const flipped = (sign(body)[0] === "a" ? "b" : "a") + sign(body).slice(1);
  await assertRejects(
    () => ingest(anyEvent as Named, call(body, { signature: flipped })),
    Error,
    "refused",
  );
});

test("any-event: a body with no event name is dropped; signature failures still throw", async () => {
  const body = '{ "id": "1" }';
  assertEquals(evs(await ingest(anyEvent as Named, call(body, { signature: sign(body) }))), []);
  await assertRejects(() => ingest(anyEvent as Named, call(body, {})), Error, "refused");
  await assertRejects(
    () => ingest(anyEvent as Named, call(body, { signature: sign(body) }), {}, { secret: "" }),
    Error,
    "secret",
  );
});
