import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-recent-leads.ts";
import newLeadPoll from "../../triggers/new-lead-poll.ts";
import newLeadForm from "../../triggers/new-lead-form.ts";
import { clock } from "../../lib/triggers.ts";

const input = { params: { formId: "form-42" }, subscriptionId: "sub-1" };
const T0 = 1_700_000_000_000;
const graphTime = (ms: number) => new Date(ms).toISOString().replace("Z", "+0000");
const lead = (id: string, ms: number) => ({
  id,
  created_time: graphTime(ms),
  form_id: "form-42",
  field_data: [{ name: "email", values: [`${id}@example.com`] }],
});
const seededOf = (s: unknown) => (s as { seeded?: boolean }).seeded;

test("list-recent-leads: createdAfter sends the documented time_created filter; absent sends none", async () => {
  const withFilter = mockCtx([{ body: { data: [], paging: {} } }]);
  await action.execute!({ formId: "f", createdAfter: 1_699_999_880 }, withFilter.ctx);
  const q = new URL(withFilter.calls[0].url).searchParams;
  assertEquals(
    q.get("filtering"),
    '[{"field":"time_created","operator":"GREATER_THAN","value":1699999880}]',
  );
  const without = mockCtx([{ body: { data: [], paging: {} } }]);
  await action.execute!({ formId: "f" }, without.ctx);
  assert(!new URL(without.calls[0].url).searchParams.has("filtering"));
});

test("new-lead-poll: seeds without a request, emits only the new lead, retries idempotently, sends the filter", async () => {
  const original = clock.now;
  clock.now = () => T0;
  try {
    const seed = mockCtx([]);
    const seeded = await newLeadPoll.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seededOf(seeded.nextState), true);
    // Brief 9.9: the seed reads nothing and stores floor = now.
    assertEquals(seed.calls.length, 0);
    assertEquals((seeded.nextState as { floor?: number }).floor, T0);

    const page = {
      data: [lead("L2", T0 + 30_000), lead("L1", T0 - 60_000)],
      paging: { cursors: { before: "x", after: "y" } },
    };
    const m = mockCtx([{ body: page }]);
    const first = await newLeadPoll.poll!({ ...input, state: seeded.nextState }, m.ctx);
    assertEquals(m.calls.length, 1);
    assertEquals(m.calls[0].method, "GET");
    const url = new URL(m.calls[0].url);
    assertEquals(url.origin + url.pathname, "https://graph.facebook.com/v19.0/form-42/leads");
    assertEquals(Object.fromEntries(url.searchParams), {
      fields: "id,created_time,ad_id,ad_name,adset_id,adset_name,form_id,field_data",
      limit: "100",
      // cursor (T0) - 120 s overlap = 1699999880 s
      filtering: '[{"field":"time_created","operator":"GREATER_THAN","value":1699999880}]',
    });
    assertEquals(first.events, [lead("L2", T0 + 30_000)]);
    const retry = await newLeadPoll.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: page }]).ctx,
    );
    assertEquals(retry, first);
  } finally {
    clock.now = original;
  }
});

// A vendor that honours `filtering` (time_created > value, in seconds), `limit` and `after`
// (an offset cursor), so restarting from page 1 cannot hide a stall.
const vendor = (all: Array<{ id: string; created_time: string }>) =>
  ({
    log: () => {},
    connection: { display: {} },
    fetch: (input: RequestInfo | URL) => {
      const url = new URL(
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      );
      const filter = JSON.parse(url.searchParams.get("filtering") ?? "[]") as Array<
        { value: number }
      >;
      const since = filter[0]?.value ?? 0;
      const start = Number(url.searchParams.get("after") ?? 0);
      const limit = Number(url.searchParams.get("limit") ?? 25);
      const rows = all.filter((r) =>
        Date.parse(r.created_time.replace(/([+-]\d{2})(\d{2})$/, "$1:$2")) / 1000 > since
      );
      const data = rows.slice(start, start + limit);
      const end = start + data.length;
      const paging = end < rows.length
        ? { cursors: { before: "b", after: String(end) }, next: "https://graph.facebook.com/next" }
        : { cursors: { before: "b", after: String(end) } };
      return Promise.resolve(
        new Response(JSON.stringify({ data, paging }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    },
  }) as unknown as Parameters<NonNullable<typeof newLeadPoll.poll>>[1];

// Brief 9.8: a window of more than maxPages (3) full pages drains across checks, each lead once.
test("new-lead-poll: a 450-lead window (4+ pages of 100) drains across checks, each once, then the cursor moves", async () => {
  const original = clock.now;
  let now = T0;
  clock.now = () => now;
  const ITEMS = Array.from({ length: 450 }, (_, n) => lead(`L${n + 1}`, T0 - 500_000 + n * 1000));
  const ctx = vendor(ITEMS);
  try {
    let state: unknown = {
      ...((await newLeadPoll.poll!({ ...input, state: {} }, ctx)).nextState as object),
      cursor: T0 - 600_000,
      floor: T0 - 600_000,
    };
    const emitted: string[] = [];
    for (let check = 0; check < 40; check++) {
      now += 300_000;
      const out = await newLeadPoll.poll!({ ...input, state }, ctx);
      state = out.nextState;
      emitted.push(...out.events.map((e) => String((e as { id: unknown }).id)));
    }
    assertEquals(emitted.length, 450);
    assertEquals(new Set(emitted).size, 450);
    assertEquals((state as { resume?: unknown }).resume, undefined);
    assertEquals((state as { cursor: number }).cursor, now);
  } finally {
    clock.now = original;
  }
});

// Brief 9.9: seed -> []; a pre-seed window of more than maxPages pages -> []; a post-seed lead -> it.
test("new-lead-poll: pre-seed leads are never emitted, a post-seed one is", async () => {
  const original = clock.now;
  let now = T0;
  clock.now = () => now;
  const ITEMS = Array.from({ length: 400 }, (_, n) => lead(`L${n + 1}`, T0 - 100_000 + n * 100));
  const ctx = vendor(ITEMS);
  try {
    const seeded = await newLeadPoll.poll!({ ...input, state: {} }, ctx);
    assertEquals(seeded.events, []);
    let state: unknown = seeded.nextState;
    const emitted: string[] = [];
    const run = async (checks: number) => {
      for (let check = 0; check < checks; check++) {
        now += 1_000;
        const out = await newLeadPoll.poll!({ ...input, state }, ctx);
        state = out.nextState;
        emitted.push(...out.events.map((e) => String((e as { id: unknown }).id)));
      }
    };
    await run(6);
    assertEquals(emitted, []);
    ITEMS.push(lead("L401", T0 + 5_000));
    await run(6);
    assertEquals(emitted, ["L401"]);
  } finally {
    clock.now = original;
  }
});

test("new-lead-poll: a missing form id is refused before any request", async () => {
  const original = clock.now;
  clock.now = () => T0;
  try {
    const seeded = await newLeadPoll.poll!(
      { params: {}, subscriptionId: "s", state: {} },
      mockCtx().ctx,
    );
    const m = mockCtx();
    await assertRejects(
      () => newLeadPoll.poll!({ params: {}, subscriptionId: "s", state: seeded.nextState }, m.ctx),
      Error,
      "Form ID is required",
    );
    assertEquals(m.calls.length, 0);
  } finally {
    clock.now = original;
  }
});

const form = (id: string) => ({ id, name: `Form ${id}`, status: "ACTIVE", locale: "en_US" });
const formsPage = (ids: string[], after?: string) => ({
  body: {
    data: ids.map(form),
    paging: after
      ? { cursors: { before: "b", after }, next: "https://graph.facebook.com/next" }
      : { cursors: { before: "b", after: "end" } },
  },
});
const formInput = { params: { pageId: "page-9" }, subscriptionId: "sub-1" };

test("new-lead-form: seeds, emits only the added form, retries idempotently", async () => {
  const seeded = await newLeadForm.poll!(
    { ...formInput, state: {} },
    mockCtx([formsPage(["1"])]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(seededOf(seeded.nextState), true);
  const run = () =>
    newLeadForm.poll!(
      { ...formInput, state: seeded.nextState },
      mockCtx([formsPage(["1", "2"])]).ctx,
    );
  const result = await run();
  assertEquals(result.events, [form("2")]);
  assertEquals(await run(), result);
});

test("new-lead-form: requests GET /{page}/leadgen_forms and follows the after cursor (literal)", async () => {
  const m = mockCtx([formsPage(["1"], "CUR1"), formsPage(["2"], "CUR2"), formsPage(["3"])]);
  const seeded = await newLeadForm.poll!({ ...formInput, state: {} }, m.ctx);
  assertEquals(m.calls.length, 3);
  const urls = m.calls.map((c) => new URL(c.url));
  for (const u of urls) {
    assertEquals(u.origin + u.pathname, "https://graph.facebook.com/v19.0/page-9/leadgen_forms");
    assertEquals(u.searchParams.get("fields"), "id,name,status,locale");
  }
  assertEquals(urls.map((u) => u.searchParams.get("after")), [null, "CUR1", "CUR2"]);
  // A form on the last page is seen on the next check.
  const next = await newLeadForm.poll!(
    { ...formInput, state: seeded.nextState },
    mockCtx([formsPage(["1"], "CUR1"), formsPage(["2"], "CUR2"), formsPage(["3", "4"])]).ctx,
  );
  assertEquals(next.events, [form("4")]);
});

test("new-lead-form: a Page with more than 20 pages of forms fails naming the cap", async () => {
  const pages = Array.from({ length: 25 }, (_, i) => formsPage([`f${i}`], `C${i}`));
  await assertRejects(
    () => newLeadForm.poll!({ ...formInput, state: {} }, mockCtx(pages).ctx),
    Error,
    "more than 20 pages",
  );
});
