import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import deletedPerson from "../../triggers/deleted-person.ts";
import updatedCompany from "../../triggers/updated-company.ts";
import deletedCompany from "../../triggers/deleted-company.ts";
import updatedLead from "../../triggers/updated-lead.ts";
import deletedLead from "../../triggers/deleted-lead.ts";
import deletedOpportunity from "../../triggers/deleted-opportunity.ts";
import updatedTask from "../../triggers/updated-task.ts";
import deletedTask from "../../triggers/deleted-task.ts";
import anyEvent from "../../triggers/any-event.ts";

// Copper does not HMAC-sign: it copies the subscription's `secret` object into the delivery body
// (https://developer.copper.com/webhooks/notification-example.html), so the "signature" under
// test is the `w6w_secret` field itself and a flipped byte of it must refuse the delivery.
const SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const callbackUrl = "https://hooks.example.test/copper/sub_2";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// Non-canonical whitespace: JSON.stringify(JSON.parse(raw)) !== raw.
const delivery = (type: string, event: string, secret: string | null = SECRET) =>
  `{ "ids" : [ 5,  6 ],\n  "type":"${type}" , "event" : "${event}",
  "subscription_id": 17065${
    secret === null ? "" : `, "w6w_secret" : ${JSON.stringify(secret)}`
  }, "timestamp":"2026-11-10T12:00:00.000Z" }`;
assertEquals(
  JSON.stringify(JSON.parse(delivery("task", "delete"))) !== delivery("task", "delete"),
  true,
);

const flip = (s: string) => (s[0] === "0" ? "1" : "0") + s.slice(1);

type Ingestible = {
  handleIngest?: (c: never) => unknown;
};
// deno-lint-ignore no-explicit-any
const ingest = async (trigger: any, state: unknown, rawBody: string | undefined) =>
  await (trigger as Ingestible).handleIngest!({
    raw: { method: "POST", path: "", query: {}, headers: {}, body: null, rawBody },
    params: {},
    state,
    subscriptionId: "sub",
  } as never);

const NAMED = [
  [deletedPerson, "deleted-person", "person", "delete"],
  [updatedCompany, "updated-company", "company", "update"],
  [deletedCompany, "deleted-company", "company", "delete"],
  [updatedLead, "updated-lead", "lead", "update"],
  [deletedLead, "deleted-lead", "lead", "delete"],
  [deletedOpportunity, "deleted-opportunity", "opportunity", "delete"],
  [updatedTask, "updated-task", "task", "update"],
  [deletedTask, "deleted-task", "task", "delete"],
] as const;

for (const [trigger, key, type, event] of NAMED) {
  const state = { webhookId: "17065", secret: SECRET, type, event };

  test(`copper ${key}: a verified ${type}.${event} delivery becomes one event per id`, async () => {
    assertEquals(trigger.key, key);
    assertEquals(
      evs(await ingest(trigger, state, delivery(type, event))),
      [5, 6].map((id) => ({
        id,
        type,
        event,
        subscriptionId: 17065,
        timestamp: "2026-11-10T12:00:00.000Z",
        updatedAttributes: null,
      })),
    );
  });

  test(`copper ${key}: a flipped byte of the secret, a missing secret or a missing raw body refuses the delivery`, async () => {
    for (const secret of [flip(SECRET), SECRET.slice(1), "", null]) {
      const err = await assertRejects(() => ingest(trigger, state, delivery(type, event, secret)));
      assertEquals(err.message.includes(SECRET), false);
    }
    const err = await assertRejects(() => ingest(trigger, state, undefined));
    assertEquals(err.message.includes("raw body"), true);
  });

  test(`copper ${key}: an unset or empty stored secret is refused before any compare`, async () => {
    for (const s of [undefined, {}, { ...state, secret: "" }]) {
      for (const body of [delivery(type, event, ""), delivery(type, event, null)]) {
        const err = await assertRejects(() => ingest(trigger, s, body));
        assertEquals(err.message.includes("secret"), true);
      }
    }
  });

  test(`copper ${key}: another type or event is acknowledged without an event`, async () => {
    const otherEvent = event === "delete" ? "new" : "delete";
    assertEquals(evs(await ingest(trigger, state, delivery(type, otherEvent))), []);
    assertEquals(
      evs(await ingest(trigger, state, delivery(type === "task" ? "lead" : "task", event))),
      [],
    );
  });

  test(`copper ${key}: onSubscribe registers exactly ${type}/${event} with a random secret`, async () => {
    const m = mockCtx([{ body: [] }, { body: { id: 31 } }]);
    const got = await trigger.onSubscribe!(
      { params: {}, callbackUrl, subscriptionId: "s", hostUrl: "https://h" },
      m.ctx,
    );
    assertEquals(m.calls.map((c) => [c.method, c.url]), [
      ["GET", "https://api.copper.com/developer_api/v1/webhooks"],
      ["POST", "https://api.copper.com/developer_api/v1/webhooks"],
    ]);
    const sent = JSON.parse(m.calls[1].body!);
    assertEquals(/^[0-9a-f]{64}$/.test(sent.secret.w6w_secret), true);
    assertEquals(sent, { target: callbackUrl, type, event, secret: sent.secret });
    assertEquals(got, { webhookId: "31", secret: sent.secret.w6w_secret, type, event });
  });
}

test("copper update triggers carry the changed attributes", async () => {
  const raw = `{ "ids" : [ 9 ], "type" : "task", "event" : "update", "w6w_secret" : "${SECRET}",
    "updated_attributes" : { "status" : [ "Open", "Completed" ] } }`;
  const state = { webhookId: "1", secret: SECRET, type: "task", event: "update" };
  assertEquals(evs(await ingest(updatedTask, state, raw)), [{
    id: 9,
    type: "task",
    event: "update",
    subscriptionId: null,
    timestamp: null,
    updatedAttributes: { status: ["Open", "Completed"] },
  }]);
});

// ---- Any Event --------------------------------------------------------------------------------

const ALL_18 = ["lead", "person", "company", "opportunity", "project", "task"].flatMap((t) =>
  ["new", "update", "delete"].map((e) => `${t}.${e}`)
);

const subscribeAny = (events: string | undefined, responses: Parameters<typeof mockCtx>[0]) => {
  const m = mockCtx(responses);
  const run = () =>
    anyEvent.onSubscribe!(
      { params: { events }, callbackUrl, subscriptionId: "s", hostUrl: "https://h" },
      m.ctx,
    );
  return { m, run };
};

test("copper any-event: an empty events param subscribes to all 18 type/event pairs", async () => {
  const responses = [{ body: [] }, ...ALL_18.map((_, i) => ({ body: { id: 100 + i } }))];
  const { m, run } = subscribeAny("", responses);
  const got = await run();
  assertEquals(m.calls.length, 19);
  assertEquals(m.calls[0].method, "GET");
  const posts = m.calls.slice(1).map((c) => {
    assertEquals([c.method, c.url], ["POST", "https://api.copper.com/developer_api/v1/webhooks"]);
    const b = JSON.parse(c.body!);
    assertEquals(b.target, callbackUrl);
    assertEquals(/^[0-9a-f]{64}$/.test(b.secret.w6w_secret), true);
    return `${b.type}.${b.event}`;
  });
  assertEquals(posts, ALL_18);
  assertEquals(got.events, ALL_18);
  assertEquals(got.webhookIds, ALL_18.map((_, i) => String(100 + i)));
  // one secret shared by every subscription
  const secrets = new Set(m.calls.slice(1).map((c) => JSON.parse(c.body!).secret.w6w_secret));
  assertEquals(secrets.size, 1);
  assertEquals(got.secret, [...secrets][0]);
});

test("copper any-event: a listed subset subscribes only to those pairs, trimmed and de-duplicated", async () => {
  const { m, run } = subscribeAny(" Person.new, task.delete ,person.new", [
    { body: [{ id: 9, target: callbackUrl }] },
    { body: { id: 9 } },
    { body: { id: 41 } },
    { body: { id: 42 } },
  ]);
  const got = await run();
  assertEquals(m.calls.map((c) => [c.method, c.url]), [
    ["GET", "https://api.copper.com/developer_api/v1/webhooks"],
    ["DELETE", "https://api.copper.com/developer_api/v1/webhooks/9"],
    ["POST", "https://api.copper.com/developer_api/v1/webhooks"],
    ["POST", "https://api.copper.com/developer_api/v1/webhooks"],
  ]);
  assertEquals(
    m.calls.slice(2).map((c) => {
      const b = JSON.parse(c.body!);
      return [b.type, b.event];
    }),
    [["person", "new"], ["task", "delete"]],
  );
  assertEquals(got.events, ["person.new", "task.delete"]);
  assertEquals(got.webhookIds, ["41", "42"]);
});

test("copper any-event: an unknown or activity event name is refused before any request", async () => {
  for (const bad of ["person.created", "user.new", "activity_log.new", "person"]) {
    const { m, run } = subscribeAny(bad, []);
    const err = await assertRejects(run);
    assertEquals(err.message.includes("unknown event"), true);
    assertEquals(m.calls.length, 0);
  }
});

test("copper any-event: a failed registration deletes the subscriptions already made", async () => {
  const { m, run } = subscribeAny("person.new,person.update,person.delete", [
    { body: [] },
    { body: { id: 51 } },
    { body: { id: 52 } },
    { status: 422, statusText: "Unprocessable", body: { message: "no" } },
    { body: { id: 51 } },
    { body: { id: 52 } },
  ]);
  await assertRejects(run);
  assertEquals(m.calls.slice(4).map((c) => [c.method, c.url]), [
    ["DELETE", "https://api.copper.com/developer_api/v1/webhooks/51"],
    ["DELETE", "https://api.copper.com/developer_api/v1/webhooks/52"],
  ]);
});

test("copper any-event: onUnsubscribe deletes every subscription and treats 404 as already gone", async () => {
  const m = mockCtx([{ body: { id: 1 } }, { status: 404, statusText: "Not Found", body: {} }, {
    body: { id: 3 },
  }]);
  await anyEvent.onUnsubscribe!({
    params: {},
    state: { webhookIds: ["1", "2", "3"], secret: SECRET, events: ["person.new"] },
    subscriptionId: "s",
  }, m.ctx);
  assertEquals(
    m.calls.map((c) => [c.method, c.url]),
    ["1", "2", "3"].map((id) => [
      "DELETE",
      `https://api.copper.com/developer_api/v1/webhooks/${id}`,
    ]),
  );
});

test("copper any-event: only deliveries for the subscribed events become events (filter)", async () => {
  const state = { webhookIds: ["1", "2"], secret: SECRET, events: ["person.new", "task.delete"] };
  assertEquals(evs(await ingest(anyEvent, state, delivery("person", "new"))).length, 2);
  assertEquals(evs(await ingest(anyEvent, state, delivery("task", "delete"))).length, 2);
  assertEquals(evs(await ingest(anyEvent, state, delivery("person", "delete"))), []);
  assertEquals(evs(await ingest(anyEvent, state, delivery("lead", "new"))), []);
  assertEquals(evs(await ingest(anyEvent, state, delivery("project", "update"))), []);
});

test("copper any-event: a project delivery is emitted when subscribed, with type and event", async () => {
  const state = { webhookIds: ["1"], secret: SECRET, events: ["project.new"] };
  assertEquals(
    evs(await ingest(anyEvent, state, delivery("project", "new"))),
    [5, 6].map((id) => ({
      id,
      type: "project",
      event: "new",
      subscriptionId: 17065,
      timestamp: "2026-11-10T12:00:00.000Z",
      updatedAttributes: null,
    })),
  );
});

test("copper any-event: a flipped secret byte, absent secret, absent raw body or unset stored secret is refused", async () => {
  const state = { webhookIds: ["1"], secret: SECRET, events: ["person.new"] };
  for (const secret of [flip(SECRET), SECRET + "0", "", null]) {
    const err = await assertRejects(() =>
      ingest(anyEvent, state, delivery("person", "new", secret))
    );
    assertEquals(err.message.includes(SECRET), false);
  }
  const err = await assertRejects(() => ingest(anyEvent, state, undefined));
  assertEquals(err.message.includes("raw body"), true);
  for (const s of [undefined, {}, { ...state, secret: "" }]) {
    for (const body of [delivery("person", "new", ""), delivery("person", "new", null)]) {
      const e = await assertRejects(() => ingest(anyEvent, s, body));
      assertEquals(e.message.includes("secret"), true);
    }
  }
});
