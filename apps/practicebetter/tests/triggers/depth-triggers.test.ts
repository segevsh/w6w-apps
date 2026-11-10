import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx, page } from "../_helpers.ts";
import type { TriggerDefinition } from "@w6w/types";
import newInvoice from "../../triggers/new-invoice.ts";
import newSession from "../../triggers/new-session.ts";
import newTag from "../../triggers/new-tag.ts";
import newReminder from "../../triggers/new-reminder.ts";
import newPackageInstance from "../../triggers/new-package-instance.ts";
import newService from "../../triggers/new-service.ts";
import newPackage from "../../triggers/new-package.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const rec = (id: string) => ({ id, dateCreated: "2026-11-10T09:00:00Z" });

const cases: Array<{ key: string; trigger: TriggerDefinition; url: string }> = [
  {
    key: "new-invoice",
    trigger: newInvoice,
    url: "https://api.practicebetter.io/consultant/payments/invoices?limit=100",
  },
  {
    key: "new-session",
    trigger: newSession,
    url: "https://api.practicebetter.io/consultant/sessions?limit=100",
  },
  {
    key: "new-tag",
    trigger: newTag,
    url: "https://api.practicebetter.io/tags?limit=100",
  },
  {
    key: "new-reminder",
    trigger: newReminder,
    url: "https://api.practicebetter.io/consultant/reminders?limit=100",
  },
  {
    key: "new-package-instance",
    trigger: newPackageInstance,
    url: "https://api.practicebetter.io/consultant/packages/instances?limit=100",
  },
  {
    key: "new-service",
    trigger: newService,
    url: "https://api.practicebetter.io/consultant/services?limit=100",
  },
  {
    key: "new-package",
    trigger: newPackage,
    url: "https://api.practicebetter.io/consultant/packages?limit=100",
  },
];

for (const c of cases) {
  test(`${c.key}: the first check seeds without emitting`, async () => {
    const seeded = await c.trigger.poll!(
      { ...input, state: {} },
      mockCtx([{ body: page([rec("r1")]) }]).ctx,
    );
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  });

  test(`${c.key}: a new record is emitted once and a retry repeats it identically`, async () => {
    const seeded = await c.trigger.poll!(
      { ...input, state: {} },
      mockCtx([{ body: page([rec("r1")]) }]).ctx,
    );
    const items = [rec("r2"), rec("r1")];
    const first = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: page(items) }]).ctx,
    );
    const retry = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: page(items) }]).ctx,
    );
    assertEquals(first.events, [rec("r2")]);
    assertEquals(retry, first);
  });

  test(`${c.key}: requests the literal list endpoint`, async () => {
    const m = mockCtx([{ body: page([rec("r1")]) }]);
    await c.trigger.poll!({ ...input, state: {} }, m.ctx);
    assertEquals(m.calls.length, 1);
    assertEquals({ method: m.calls[0].method, url: m.calls[0].url }, { method: "GET", url: c.url });
  });
}

test("new-service: follows skip while hasMore and emits a record found on page 2", async () => {
  const full = Array.from({ length: 100 }, (_, i) => rec(`s${i}`));
  const seedCtx = mockCtx([{ body: page(full, { hasMore: true }) }, { body: page([rec("t1")]) }]);
  const seeded = await newService.poll!({ ...input, state: {} }, seedCtx.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seedCtx.calls.map((c) => c.url), [
    "https://api.practicebetter.io/consultant/services?limit=100",
    "https://api.practicebetter.io/consultant/services?limit=100&skip=100",
  ]);
  const next = await newService.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page(full, { hasMore: true }) }, { body: page([rec("t1"), rec("t2")]) }]).ctx,
  );
  assertEquals(next.events, [rec("t2")]);
});

test("new-package: a collection of more than 500 records fails loudly instead of being half-read", async () => {
  const full = Array.from({ length: 100 }, (_, i) => rec(`p${i}`));
  const responses = Array.from({ length: 5 }, () => ({ body: page(full, { hasMore: true }) }));
  await assertRejects(
    () => newPackage.poll!({ ...input, state: {} }, mockCtx(responses).ctx),
    Error,
    "500 records",
  );
});
