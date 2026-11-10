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
const topCursorPage = (items: unknown[], cursor?: string) => ({
  body: cursor ? { data: items, cursor } : { data: items },
});
const nextPage = (items: unknown[], next?: string) => ({
  body: {
    data: items,
    page_size: 100,
    count: 250,
    has_next_page: next !== undefined,
    ...(next ? { next } : {}),
  },
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
    page: (items: unknown[]) => topCursorPage(items),
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
    url: `${R}/time_offs/profile/h1?page_size=100`,
    page: (items: unknown[]) => nextPage(items),
  },
  {
    name: "new-timesheet",
    t: newTimesheet,
    params: { statuses: "pending" },
    url: `${R}/timesheets?statuses=pending&limit=100&offset=0`,
    page: (items: unknown[]) => offsetPage(items, items.length),
  },
  {
    name: "new-invoice-adjustment",
    t: newInvoiceAdjustment,
    params: { statuses: "pending" },
    url: `${R}/invoice-adjustments?statuses=pending&limit=100&offset=0`,
    page: (items: unknown[]) => offsetPage(items, items.length),
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

const rows = (from: number, n: number) => Array.from({ length: n }, (_, i) => rec(`r${from + i}`));
const run = (
  t: { poll?: (...a: never[]) => unknown },
  params: unknown,
  state: unknown,
  m: unknown,
) =>
  // deno-lint-ignore no-explicit-any
  (t as any).poll({ params, subscriptionId: "s", state }, (m as any).ctx);

describe("defaults and paging", () => {
  test("a timesheet trigger with no statuses param watches pending only", async () => {
    const m = mockCtx([offsetPage([rec("1")], 1)]);
    await newTimesheet.poll!({ params: {}, subscriptionId: "s", state: {} }, m.ctx);
    assertEquals(m.calls[0].url, `${R}/timesheets?statuses=pending&limit=100&offset=0`);
  });

  test("a blank statuses param watches every status", async () => {
    const m = mockCtx([offsetPage([rec("1")], 1)]);
    await newInvoiceAdjustment.poll!(
      { params: { statuses: "" }, subscriptionId: "s", state: {} },
      m.ctx,
    );
    assertEquals(m.calls[0].url, `${R}/invoice-adjustments?limit=100&offset=0`);
  });

  // Vendor shape: 250 rows, 100 a page, offset + total_rows (no cursor).
  for (
    const [name, t, path] of [
      ["new-timesheet", newTimesheet, "timesheets"],
      ["new-invoice-adjustment", newInvoiceAdjustment, "invoice-adjustments"],
    ] as const
  ) {
    test(`${name} reads all 250 rows over offset=0,100,200 and emits the row past page one`, async () => {
      const pages = () => [
        offsetPage(rows(0, 100), 250),
        offsetPage(rows(100, 100), 250),
        offsetPage(rows(200, 50), 250),
      ];
      const m = mockCtx(pages());
      const seeded = await run(t, {}, {}, m) as { events: unknown[]; nextState: unknown };
      assertEquals(seeded.events, []);
      assertEquals(m.calls.map((c) => c.url), [
        `${R}/${path}?statuses=pending&limit=100&offset=0`,
        `${R}/${path}?statuses=pending&limit=100&offset=100`,
        `${R}/${path}?statuses=pending&limit=100&offset=200`,
      ]);
      const more = [...pages().slice(0, 2), offsetPage([...rows(200, 50), rec("new")], 251)];
      const later = await run(t, {}, seeded.nextState, mockCtx(more)) as { events: unknown[] };
      assertEquals(later.events, [rec("new")]);
    });
  }

  // Vendor shape: `cursor` query param; next cursor in page.cursor (legal entities)
  // or top level (webhooks).
  for (
    const [name, t, path, mk] of [
      ["new-webhook", newWebhook, "webhooks", topCursorPage],
      ["new-legal-entity", newLegalEntity, "legal-entities", cursorPage],
    ] as const
  ) {
    test(`${name} follows the vendor cursor across 250 rows`, async () => {
      const pages = (last: unknown[]) => [
        mk(rows(0, 100), "cur-1"),
        mk(rows(100, 100), "cur-2"),
        mk(last),
      ];
      const m = mockCtx(pages(rows(200, 50)));
      const seeded = await run(t, {}, {}, m) as { events: unknown[]; nextState: unknown };
      assertEquals(seeded.events, []);
      assertEquals(m.calls.map((c) => c.url), [
        `${R}/${path}?limit=100`,
        `${R}/${path}?limit=100&cursor=cur-1`,
        `${R}/${path}?limit=100&cursor=cur-2`,
      ]);
      const later = await run(
        t,
        {},
        seeded.nextState,
        mockCtx(pages([...rows(200, 50), rec("new")])),
      );
      assertEquals((later as { events: unknown[] }).events, [rec("new")]);
    });

    test(`${name} fails loudly on a repeated cursor instead of looping`, async () => {
      const m = mockCtx([mk(rows(0, 100), "cur-1"), mk(rows(100, 100), "cur-1")]);
      await assertRejects(() => run(t, {}, {}, m) as Promise<unknown>, Error, "repeated");
    });
  }

  // Vendor shape: `page_size` + `next` token, `has_next_page`; no offset or total_rows.
  test("new-time-off-request follows the vendor next token across 250 rows", async () => {
    const pages = (last: unknown[]) => [
      nextPage(rows(0, 100), "tok-1"),
      nextPage(rows(100, 100), "tok-2"),
      nextPage(last),
    ];
    const params = { hrisProfileId: "h1" };
    const m = mockCtx(pages(rows(200, 50)));
    const seeded = await run(newTimeOffRequest, params, {}, m) as {
      events: unknown[];
      nextState: unknown;
    };
    assertEquals(seeded.events, []);
    assertEquals(m.calls.map((c) => c.url), [
      `${R}/time_offs/profile/h1?page_size=100`,
      `${R}/time_offs/profile/h1?page_size=100&next=tok-1`,
      `${R}/time_offs/profile/h1?page_size=100&next=tok-2`,
    ]);
    const later = await run(
      newTimeOffRequest,
      params,
      seeded.nextState,
      mockCtx(pages([...rows(200, 50), rec("new")])),
    );
    assertEquals((later as { events: unknown[] }).events, [rec("new")]);
  });

  test("new-time-off-request stops after a single vendor page (no offset loop)", async () => {
    const m = mockCtx([nextPage([rec("1"), rec("2")])]);
    await run(newTimeOffRequest, { hrisProfileId: "h1" }, {}, m);
    assertEquals(m.calls.length, 1);
  });

  test("new-time-off-request fails loudly on a repeated next token", async () => {
    const m = mockCtx([nextPage(rows(0, 100), "tok-1"), nextPage(rows(100, 100), "tok-1")]);
    await assertRejects(
      () => run(newTimeOffRequest, { hrisProfileId: "h1" }, {}, m) as Promise<unknown>,
      Error,
      "repeated",
    );
  });

  test("new-time-off-request refuses more than 5000 rows", async () => {
    const pages = Array.from(
      { length: 51 },
      (_, p) => nextPage(rows(p * 100, 100), p < 50 ? `tok-${p}` : undefined),
    );
    await assertRejects(
      () => run(newTimeOffRequest, { hrisProfileId: "h1" }, {}, mockCtx(pages)) as Promise<unknown>,
      Error,
      "5000",
    );
  });

  test("refuses more than 5000 rows instead of truncating", async () => {
    const pages = Array.from({ length: 51 }, (_, p) =>
      topCursorPage(
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
