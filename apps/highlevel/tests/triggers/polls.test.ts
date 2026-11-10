import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockHighLevelCtx } from "../_helpers.ts";
import app from "../../index.ts";
import listOpportunities from "../../actions/list-opportunities.ts";
import listConversations from "../../actions/list-conversations.ts";
import newOpportunity from "../../triggers/new-opportunity.ts";
import conversationActive from "../../triggers/conversation-active.ts";
import newPipeline from "../../triggers/new-pipeline.ts";
import newCalendar from "../../triggers/new-calendar.ts";
import newForm from "../../triggers/new-form.ts";

const API = "https://services.leadconnectorhq.com";
const input = (params: Record<string, unknown>, state: unknown) => ({
  params,
  state,
  subscriptionId: "s",
});
const seededOf = (r: { nextState: unknown }) => (r.nextState as { seeded: boolean }).seeded;

test("app wires the five poll triggers, each with output, sample and a poll (no onSubscribe)", () => {
  for (
    const [key, t] of [
      ["new-opportunity", newOpportunity],
      ["conversation-active", conversationActive],
      ["new-pipeline", newPipeline],
      ["new-calendar", newCalendar],
      ["new-form", newForm],
    ] as const
  ) {
    const shipped = app.triggers.find((x) => x.key === key);
    assert(shipped === t, key);
    assertEquals(typeof t.poll, "function");
    assertEquals(t.onSubscribe, undefined);
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.minIntervalMs, 300_000);
  }
});

// ---- the two additive, default-preserving action params ----

test("list-opportunities: without `order` no order is sent; with it, it is", async () => {
  const a = mockHighLevelCtx([{ body: { opportunities: [] } }], "loc-1");
  await listOpportunities.execute!({}, a.ctx);
  assertEquals(
    a.calls[0].url,
    `${API}/opportunities/search?location_id=loc-1&page=1&limit=20`,
  );
  const b = mockHighLevelCtx([{ body: { opportunities: [] } }], "loc-1");
  await listOpportunities.execute!({ order: "added_desc" }, b.ctx);
  assertEquals(
    b.calls[0].url,
    `${API}/opportunities/search?location_id=loc-1&order=added_desc&page=1&limit=20`,
  );
});

test("list-conversations: without sort/sortBy none is sent; with them, they are", async () => {
  const a = mockHighLevelCtx([{ body: { conversations: [] } }], "loc-1");
  await listConversations.execute!({}, a.ctx);
  assertEquals(a.calls[0].url, `${API}/conversations/search?locationId=loc-1&status=all&limit=20`);
  const b = mockHighLevelCtx([{ body: { conversations: [] } }], "loc-1");
  await listConversations.execute!({ sort: "desc", sortBy: "last_message_date" }, b.ctx);
  assertEquals(
    b.calls[0].url,
    `${API}/conversations/search?locationId=loc-1&status=all&sort=desc&sortBy=last_message_date&limit=20`,
  );
});

// ---- new-opportunity (newest-first, pollFromListAction) ----

const opp = (id: string) => ({ id, name: `deal ${id}`, status: "open" });
const oppPage = (...ids: string[]) => ({ body: { opportunities: ids.map(opp), meta: {} } });

test("new-opportunity: seeds without events, then emits only the new opportunity, idempotently", async () => {
  const seeded = await newOpportunity.poll!(
    input({}, {}),
    mockHighLevelCtx([oppPage("o2", "o1")], "loc-1").ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(seededOf(seeded), true);
  const run = () =>
    newOpportunity.poll!(
      input({}, seeded.nextState),
      mockHighLevelCtx([oppPage("o3", "o2", "o1")], "loc-1").ctx,
    );
  const first = await run();
  assertEquals(first.events, [opp("o3")]);
  assertEquals(await run(), first);
});

test("new-opportunity: the request is the list action's, newest first, 100 per page", async () => {
  const a = mockHighLevelCtx([oppPage("o1")], "loc-1");
  await newOpportunity.poll!(input({}, {}), a.ctx);
  assertEquals(a.calls.length, 1);
  assertEquals(a.calls[0].method, "GET");
  assertEquals(
    a.calls[0].url,
    `${API}/opportunities/search?location_id=loc-1&order=added_desc&page=1&limit=100`,
  );
  assertEquals(a.calls[0].headers["version"], "2021-07-28");
  const b = mockHighLevelCtx([oppPage("o1")], "loc-1");
  await newOpportunity.poll!(input({ pipelineId: "pl1" }, {}), b.ctx);
  assertEquals(
    b.calls[0].url,
    `${API}/opportunities/search?location_id=loc-1&pipeline_id=pl1&order=added_desc&page=1&limit=100`,
  );
});

test("new-opportunity: a repeat of an already seen page emits nothing", async () => {
  const seeded = await newOpportunity.poll!(
    input({}, {}),
    mockHighLevelCtx([oppPage("o1")], "loc-1").ctx,
  );
  const again = await newOpportunity.poll!(
    input({}, seeded.nextState),
    mockHighLevelCtx([oppPage("o1")], "loc-1").ctx,
  );
  assertEquals(again.events, []);
});

// ---- conversation-active (newest-activity-first, pollFromListAction) ----

const conv = (id: string) => ({ id, contactId: `c-${id}`, lastMessageBody: "hi", unreadCount: 1 });
const convPage = (...ids: string[]) => ({ body: { conversations: ids.map(conv), total: 99 } });

test("conversation-active: seeds without events, then emits only the conversation that newly appears", async () => {
  const seeded = await conversationActive.poll!(
    input({}, {}),
    mockHighLevelCtx([convPage("v2", "v1")], "loc-1").ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(seededOf(seeded), true);
  const run = () =>
    conversationActive.poll!(
      input({}, seeded.nextState),
      mockHighLevelCtx([convPage("v3", "v2", "v1")], "loc-1").ctx,
    );
  const first = await run();
  assertEquals(first.events, [conv("v3")]);
  assertEquals(await run(), first);
});

test("conversation-active: the request is the list action's, most recently active first", async () => {
  const a = mockHighLevelCtx([convPage("v1")], "loc-1");
  await conversationActive.poll!(input({}, {}), a.ctx);
  assertEquals(a.calls.length, 1);
  assertEquals(a.calls[0].method, "GET");
  assertEquals(
    a.calls[0].url,
    `${API}/conversations/search?locationId=loc-1&status=all&sort=desc&sortBy=last_message_date&limit=20`,
  );
  assertEquals(a.calls[0].headers["version"], "2021-04-15");
});

test("conversation-active: a conversation already reported is not reported for its next message", async () => {
  const seeded = await conversationActive.poll!(
    input({}, {}),
    mockHighLevelCtx([convPage("v1")], "loc-1").ctx,
  );
  const again = await conversationActive.poll!(
    input({}, seeded.nextState),
    mockHighLevelCtx([convPage("v1")], "loc-1").ctx,
  );
  assertEquals(again.events, []);
});

// ---- bounded snapshots: pipelines, calendars, forms ----

const specs = [
  {
    name: "new-pipeline",
    trigger: newPipeline,
    url: `${API}/opportunities/pipelines?locationId=loc-1`,
    version: "2021-07-28",
    params: {},
    page: (...ids: string[]) => ({ body: { pipelines: ids.map((id) => ({ id, name: id })) } }),
    item: (id: string) => ({ id, name: id }),
  },
  {
    name: "new-calendar",
    trigger: newCalendar,
    url: `${API}/calendars/?locationId=loc-1&showDrafted=true`,
    version: "2021-04-15",
    params: {},
    page: (...ids: string[]) => ({ body: { calendars: ids.map((id) => ({ id, name: id })) } }),
    item: (id: string) => ({ id, name: id }),
  },
  {
    name: "new-form",
    trigger: newForm,
    url: `${API}/forms/?locationId=loc-1&skip=0&limit=50`,
    version: "2021-07-28",
    params: {},
    page: (...ids: string[]) => ({
      body: { forms: ids.map((id) => ({ id, name: id })), total: ids.length },
    }),
    item: (id: string) => ({ id, name: id }),
  },
];

for (const { name, trigger, url, version, params, page, item } of specs) {
  test(`${name}: seeds without events, then emits only the new record, idempotently`, async () => {
    const seeded = await trigger.poll!(
      input(params, {}),
      mockHighLevelCtx([page("one")], "loc-1").ctx,
    );
    assertEquals(seeded.events, []);
    assertEquals(seededOf(seeded), true);
    const run = () =>
      trigger.poll!(
        input(params, seeded.nextState),
        mockHighLevelCtx([page("two", "one")], "loc-1").ctx,
      );
    const first = await run();
    assertEquals(first.events, [item("two")]);
    assertEquals(await run(), first);
  });

  test(`${name}: makes the literal request of its list action`, async () => {
    const mock = mockHighLevelCtx([page("one")], "loc-1");
    await trigger.poll!(input(params, {}), mock.ctx);
    assertEquals(mock.calls.length, 1);
    assertEquals(mock.calls[0].method, "GET");
    assertEquals(mock.calls[0].url, url);
    assertEquals(mock.calls[0].headers["version"], version);
  });

  test(`${name}: does not re-emit a record that was already seen`, async () => {
    const seeded = await trigger.poll!(
      input(params, {}),
      mockHighLevelCtx([page("one")], "loc-1").ctx,
    );
    const again = await trigger.poll!(
      input(params, seeded.nextState),
      mockHighLevelCtx([page("one")], "loc-1").ctx,
    );
    assertEquals(again.events, []);
  });
}

test("new-calendar: the calendar group param is sent as groupId", async () => {
  const mock = mockHighLevelCtx([{ body: { calendars: [] } }], "loc-1");
  await newCalendar.poll!(input({ groupId: "g1" }, {}), mock.ctx);
  assertEquals(mock.calls[0].url, `${API}/calendars/?locationId=loc-1&groupId=g1&showDrafted=true`);
});

test("new-pipeline: a pipeline without an id fails loudly", async () => {
  await assertRejects(
    async () =>
      await newPipeline.poll!(
        input({}, {}),
        mockHighLevelCtx([{ body: { pipelines: [{ name: "x" }] } }], "loc-1").ctx,
      ),
    Error,
    "without an id",
  );
});

const formsOf = (from: number, n: number) => ({
  id: "x",
  forms: Array.from({ length: n }, (_, i) => ({ id: `f${from + i}`, name: `form ${from + i}` })),
});

test("new-form: reads every page (skip advances by 50) and emits a form added on the last one", async () => {
  const full = (from: number) => ({ body: { forms: formsOf(from, 50).forms, total: 120 } });
  const seeded = await newForm.poll!(
    input({}, {}),
    mockHighLevelCtx(
      [full(0), full(50), { body: { forms: formsOf(100, 20).forms, total: 120 } }],
      "loc-1",
    ).ctx,
  );
  assertEquals(seeded.events, []);
  const mock = mockHighLevelCtx(
    [
      full(0),
      full(50),
      { body: { forms: [...formsOf(100, 20).forms, { id: "fNEW", name: "new" }], total: 121 } },
    ],
    "loc-1",
  );
  const out = await newForm.poll!(input({}, seeded.nextState), mock.ctx);
  assertEquals(out.events, [{ id: "fNEW", name: "new" }]);
  assertEquals(mock.calls.map((c) => c.url), [
    `${API}/forms/?locationId=loc-1&skip=0&limit=50`,
    `${API}/forms/?locationId=loc-1&skip=50&limit=50`,
    `${API}/forms/?locationId=loc-1&skip=100&limit=50`,
  ]);
});

test("new-form: stops at `total` even when the last page is full", async () => {
  const mock = mockHighLevelCtx(
    [{ body: { forms: formsOf(0, 50).forms, total: 50 } }],
    "loc-1",
  );
  const out = await newForm.poll!(input({}, {}), mock.ctx);
  assertEquals(out.events, []);
  assertEquals(mock.calls.length, 1);
});

test("new-form: more than 40 full pages fails loudly instead of missing forms", async () => {
  const pages = Array.from({ length: 40 }, (_, p) => ({
    body: { forms: formsOf(p * 50, 50).forms },
  }));
  await assertRejects(
    async () => await newForm.poll!(input({}, {}), mockHighLevelCtx(pages, "loc-1").ctx),
    Error,
    "2000 forms",
  );
});
