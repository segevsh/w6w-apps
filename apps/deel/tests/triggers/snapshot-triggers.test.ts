import { describe, test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newPerson from "../../triggers/new-person.ts";
import newLegalEntity from "../../triggers/new-legal-entity.ts";
import newWebhook from "../../triggers/new-webhook.ts";
import newContractMilestone from "../../triggers/new-contract-milestone.ts";
import newTimeOffRequest from "../../triggers/new-time-off-request.ts";
import newTimesheet from "../../triggers/new-timesheet.ts";
import newInvoiceAdjustment from "../../triggers/new-invoice-adjustment.ts";

const R = "https://api.letsdeel.com/rest";
const rec = (id: string) => ({ id, status: "pending" });
const cursorPage = (items: unknown[], cursor?: string) => ({
  body: { data: items, page: cursor ? { cursor } : {} },
});
const offsetPage = (items: unknown[], total: number) => ({
  body: { data: items, page: { total_rows: total } },
});

// URLs are literals: the endpoint the wrapped list action calls, 100 rows a page.
const cases = [
  {
    name: "new-person",
    t: newPerson,
    params: {},
    url: `${R}/people?limit=100&offset=0`,
    page: (items: unknown[]) => offsetPage(items, items.length),
  },
  {
    name: "new-legal-entity",
    t: newLegalEntity,
    params: {},
    url: `${R}/legal-entities?limit=100`,
    page: (items: unknown[]) => cursorPage(items),
  },
  {
    name: "new-webhook",
    t: newWebhook,
    params: {},
    url: `${R}/webhooks?limit=100`,
    page: (items: unknown[]) => cursorPage(items),
  },
  {
    name: "new-contract-milestone",
    t: newContractMilestone,
    params: { contractId: "c1" },
    url: `${R}/contracts/c1/milestones?limit=100`,
    page: (items: unknown[]) => cursorPage(items),
  },
  {
    name: "new-time-off-request",
    t: newTimeOffRequest,
    params: { hrisProfileId: "h1" },
    url: `${R}/time_offs/profile/h1?limit=100&offset=0`,
    page: (items: unknown[]) => offsetPage(items, items.length),
  },
  {
    name: "new-timesheet",
    t: newTimesheet,
    params: { statuses: "pending" },
    url: `${R}/timesheets?statuses=pending&limit=100`,
    page: (items: unknown[]) => cursorPage(items),
  },
  {
    name: "new-invoice-adjustment",
    t: newInvoiceAdjustment,
    params: { statuses: "pending" },
    url: `${R}/invoice-adjustments?statuses=pending&limit=100`,
    page: (items: unknown[]) => cursorPage(items),
  },
];

for (const c of cases) {
  describe(c.name, () => {
    const input = (state: unknown) => ({ params: c.params, subscriptionId: "sub-1", state });
    const poll = c.t.poll!;

    test("seeds without emitting; sends the literal list request", async () => {
      const m = mockCtx([c.page([rec("1"), rec("2")])]);
      const out = await poll(input({}), m.ctx);
      assertEquals(out.events, []);
      assertEquals((out.nextState as { seeded?: boolean }).seeded, true);
      assertEquals(m.calls.length, 1);
      assertEquals(m.calls[0].method, "GET");
      assertEquals(m.calls[0].url, c.url);
    });

    test("emits exactly the new record and is idempotent on retry", async () => {
      const seeded = await poll(input({}), mockCtx([c.page([rec("1"), rec("2")])]).ctx);
      const run = () =>
        poll(input(seeded.nextState), mockCtx([c.page([rec("1"), rec("2"), rec("3")])]).ctx);
      const first = await run();
      assertEquals(first.events, [rec("3")]);
      assertEquals(await run(), first);
      const quiet = await poll(
        input(first.nextState),
        mockCtx([c.page([rec("1"), rec("2"), rec("3")])]).ctx,
      );
      assertEquals(quiet.events, []);
    });
  });
}

describe("defaults and paging", () => {
  test("a timesheet trigger with no statuses param watches pending only", async () => {
    const m = mockCtx([cursorPage([rec("1")])]);
    await newTimesheet.poll!({ params: {}, subscriptionId: "s", state: {} }, m.ctx);
    assertEquals(m.calls[0].url, `${R}/timesheets?statuses=pending&limit=100`);
  });

  test("a blank statuses param watches every status", async () => {
    const m = mockCtx([cursorPage([rec("1")])]);
    await newInvoiceAdjustment.poll!(
      { params: { statuses: "" }, subscriptionId: "s", state: {} },
      m.ctx,
    );
    assertEquals(m.calls[0].url, `${R}/invoice-adjustments?limit=100`);
  });

  test("follows the cursor to the second page (literal after_cursor) before diffing", async () => {
    const m = mockCtx([cursorPage([rec("1")], "cur-1"), cursorPage([rec("2")])]);
    const out = await newWebhook.poll!({ params: {}, subscriptionId: "s", state: {} }, m.ctx);
    assertEquals(out.events, []);
    assertEquals(m.calls.map((c) => c.url), [
      `${R}/webhooks?limit=100`,
      `${R}/webhooks?limit=100&after_cursor=cur-1`,
    ]);
    const later = await newWebhook.poll!(
      { params: {}, subscriptionId: "s", state: out.nextState },
      mockCtx([cursorPage([rec("1")], "cur-1"), cursorPage([rec("2"), rec("3")])]).ctx,
    );
    assertEquals(later.events, [rec("3")]);
  });

  test("refuses more than 5000 rows instead of truncating", async () => {
    const pages = Array.from({ length: 51 }, (_, p) =>
      cursorPage(
        Array.from({ length: 100 }, (_, i) => rec(`r${p * 100 + i}`)),
        p < 50 ? `cur-${p}` : undefined,
      ));
    await assertRejects(
      () => newWebhook.poll!({ params: {}, subscriptionId: "s", state: {} }, mockCtx(pages).ctx),
      Error,
      "5000",
    );
  });
});
