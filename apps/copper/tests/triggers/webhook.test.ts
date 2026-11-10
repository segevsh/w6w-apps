import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newPerson from "../../triggers/new-person.ts";
import updatedPerson from "../../triggers/updated-person.ts";
import newLead from "../../triggers/new-lead.ts";
import newCompany from "../../triggers/new-company.ts";
import newOpportunity from "../../triggers/new-opportunity.ts";
import updatedOpportunity from "../../triggers/updated-opportunity.ts";
import newTask from "../../triggers/new-task.ts";

const SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const callbackUrl = "https://hooks.example.test/copper/sub_1";
const state = { webhookId: "17065", secret: SECRET, type: "person", event: "new" };

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// Non-canonical whitespace: JSON.stringify(JSON.parse(raw)) !== raw.
const delivery = (secret: string | null = SECRET, type = "person", event = "new") =>
  `{ "ids" : [ 123,  456 ],\n  "type":"${type}" , "event" : "${event}",
  "subscription_id": 17065${
    secret === null ? "" : `, "w6w_secret" : ${JSON.stringify(secret)}`
  }, "timestamp":"2026-11-09T12:00:00.000Z" }`;
assertEquals(JSON.stringify(JSON.parse(delivery())) !== delivery(), true);

const ingest = async (
  trigger: typeof newPerson,
  over: { rawBody?: string | undefined; state?: unknown } = {},
) =>
  await trigger.handleIngest!({
    raw: {
      method: "POST",
      path: "",
      query: {},
      headers: {},
      body: null,
      ...("rawBody" in over ? { rawBody: over.rawBody } : { rawBody: delivery() }),
    },
    params: {},
    state: ("state" in over ? over.state : state) as typeof state,
    subscriptionId: "sub",
  }, mockCtx().ctx);

test("copper: a delivery carrying the stored secret becomes one event per record id", async () => {
  const events = evs(await ingest(newPerson));
  assertEquals(
    events,
    [123, 456].map((id) => ({
      id,
      type: "person",
      event: "new",
      subscriptionId: 17065,
      timestamp: "2026-11-09T12:00:00.000Z",
      updatedAttributes: null,
    })),
  );
  assertEquals(JSON.stringify(events).includes(SECRET), false);
});

test("copper: an update delivery carries the changed attributes", async () => {
  const raw = `{ "ids" : [ 7 ], "type" : "person", "event" : "update", "w6w_secret" : "${SECRET}",
    "updated_attributes" : { "title" : [ "A", "B" ] } }`;
  assertEquals(evs(await ingest(updatedPerson, { rawBody: raw })), [{
    id: 7,
    type: "person",
    event: "update",
    subscriptionId: null,
    timestamp: null,
    updatedAttributes: { title: ["A", "B"] },
  }]);
});

test("copper: a wrong, truncated, empty or absent secret is refused and never echoed", async () => {
  const flipped = (SECRET[0] === "0" ? "1" : "0") + SECRET.slice(1);
  for (const secret of [flipped, SECRET.slice(1), SECRET + "0", "", null]) {
    const err = await assertRejects(() => ingest(newPerson, { rawBody: delivery(secret) }));
    assertEquals(err.message.includes(SECRET), false);
    assertEquals(err.message.includes(flipped), false);
  }
});

test("copper: an absent raw body, a non-JSON body or a non-object body is refused", async () => {
  const err = await assertRejects(() => ingest(newPerson, { rawBody: undefined }));
  assertEquals(err.message.includes("raw body"), true);
  await assertRejects(() => ingest(newPerson, { rawBody: "ids=1" }));
  await assertRejects(() => ingest(newPerson, { rawBody: "[1]" }));
});

test("copper: an unset or empty stored secret refuses even a delivery with an empty secret", async () => {
  for (const s of [undefined, {}, { ...state, secret: "" }, { ...state, secret: undefined }]) {
    for (const rawBody of [delivery(""), delivery(null)]) {
      const err = await assertRejects(() => ingest(newPerson, { state: s, rawBody }));
      assertEquals(err.message.includes("secret"), true);
    }
  }
});

test("copper: a verified delivery for another type or event is acknowledged without an event", async () => {
  assertEquals(evs(await ingest(newLead)), []);
  assertEquals(evs(await ingest(newCompany)), []);
  assertEquals(evs(await ingest(updatedPerson)), []);
  assertEquals(evs(await ingest(newOpportunity)), []);
  assertEquals(evs(await ingest(newTask)), []);
  assertEquals(evs(await ingest(updatedOpportunity)), []);
});

test("copper: onSubscribe registers a random secret, replaces leftovers, and stores what it sent", async () => {
  const m = mockCtx([
    { body: [{ id: 9, target: callbackUrl }, { id: 10, target: "https://x.test" }] },
    { body: { id: 9 } },
    { body: { id: 17065, target: callbackUrl, type: "person", event: "new" } },
  ]);
  const got = await newPerson.onSubscribe!(
    { params: {}, callbackUrl, subscriptionId: "sub", hostUrl: "https://h" },
    m.ctx,
  );
  assertEquals(m.calls.map((c) => [c.method, c.url]), [
    ["GET", "https://api.copper.com/developer_api/v1/webhooks"],
    ["DELETE", "https://api.copper.com/developer_api/v1/webhooks/9"],
    ["POST", "https://api.copper.com/developer_api/v1/webhooks"],
  ]);
  const sent = JSON.parse(m.calls[2].body!);
  assertEquals(/^[0-9a-f]{64}$/.test(sent.secret.w6w_secret), true);
  assertEquals(sent, {
    target: callbackUrl,
    type: "person",
    event: "new",
    secret: { w6w_secret: sent.secret.w6w_secret },
  });
  assertEquals(got, {
    webhookId: "17065",
    secret: sent.secret.w6w_secret,
    type: "person",
    event: "new",
  });
});

test("copper: updated-opportunity subscribes to the opportunity update event", async () => {
  const m = mockCtx([{ body: [] }, { body: { id: 1 } }]);
  await updatedOpportunity.onSubscribe!(
    { params: {}, callbackUrl, subscriptionId: "s", hostUrl: "h" },
    m.ctx,
  );
  const sent = JSON.parse(m.calls[1].body!);
  assertEquals([sent.type, sent.event], ["opportunity", "update"]);
});

test("copper: onUnsubscribe deletes the subscription and treats 404/410 as already gone", async () => {
  const m = mockCtx([{ body: { id: 17065 } }]);
  await newPerson.onUnsubscribe!({ params: {}, state, subscriptionId: "sub" }, m.ctx);
  assertEquals(m.calls.map((c) => [c.method, c.url]), [[
    "DELETE",
    "https://api.copper.com/developer_api/v1/webhooks/17065",
  ]]);
  for (const status of [404, 410]) {
    await newPerson.onUnsubscribe!(
      { params: {}, state, subscriptionId: "sub" },
      mockCtx([{ status, body: { message: "gone" } }]).ctx,
    );
  }
  await assertRejects(() =>
    newPerson.onUnsubscribe!(
      { params: {}, state, subscriptionId: "sub" },
      mockCtx([{ status: 500, body: {} }]).ctx,
    )
  );
});

test("copper: every trigger declares output and a sample", () => {
  const all = [
    newPerson,
    updatedPerson,
    newLead,
    newCompany,
    newOpportunity,
    updatedOpportunity,
    newTask,
  ];
  for (const t of all) {
    assertEquals(Array.isArray(t.output) && t.output.length > 0, true);
    assertEquals(t.sample !== undefined, true);
  }
});
