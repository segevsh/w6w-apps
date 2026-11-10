import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, page } from "../_helpers.ts";
import newEmployee from "../../triggers/new-employee.ts";
import newEstimate from "../../triggers/new-estimate.ts";
import newEstimateOptionLineItem from "../../triggers/new-estimate-option-line-item.ts";
import newEvent from "../../triggers/new-event.ts";
import newInvoice from "../../triggers/new-invoice.ts";
import newJobAppointment from "../../triggers/new-job-appointment.ts";
import newJobInvoice from "../../triggers/new-job-invoice.ts";
import newJobLineItem from "../../triggers/new-job-line-item.ts";
import newJob from "../../triggers/new-job.ts";
import newLead from "../../triggers/new-lead.ts";
import newOrUpdatedEstimate from "../../triggers/new-or-updated-estimate.ts";
import newOrUpdatedInvoice from "../../triggers/new-or-updated-invoice.ts";
import newOrUpdatedJob from "../../triggers/new-or-updated-job.ts";
import newOrUpdatedLead from "../../triggers/new-or-updated-lead.ts";

const base = "https://api.housecallpro.com";
const parent = { jobId: "job-1", estimateId: "estimate-1", optionId: "option-1" };

const cases = [
  [
    "new-employee",
    newEmployee,
    "employees",
    {},
    `${base}/employees?page=1&page_size=100&sort_by=created_at&sort_direction=desc`,
  ],
  [
    "new-estimate",
    newEstimate,
    "estimates",
    {},
    `${base}/estimates?page=1&page_size=100&sort_by=created_at&sort_direction=desc`,
  ],
  [
    "new-event",
    newEvent,
    "events",
    {},
    `${base}/events?page=1&page_size=100&sort_by=created_at&sort_direction=desc`,
  ],
  [
    "new-invoice",
    newInvoice,
    "invoices",
    {},
    `${base}/invoices?page=1&page_size=100&sort_by=created_at&sort_direction=desc`,
  ],
  [
    "new-job",
    newJob,
    "jobs",
    {},
    `${base}/jobs?page=1&page_size=100&sort_by=created_at&sort_direction=desc`,
  ],
  [
    "new-lead",
    newLead,
    "leads",
    {},
    `${base}/leads?page=1&page_size=100&sort_by=created_at&sort_direction=desc`,
  ],
  [
    "new-job-appointment",
    newJobAppointment,
    "appointments",
    parent,
    `${base}/jobs/job-1/appointments`,
  ],
  ["new-job-invoice", newJobInvoice, "invoices", parent, `${base}/jobs/job-1/invoices`],
  ["new-job-line-item", newJobLineItem, "line_items", parent, `${base}/jobs/job-1/line_items`],
  [
    "new-estimate-option-line-item",
    newEstimateOptionLineItem,
    "line_items",
    parent,
    `${base}/estimates/estimate-1/options/option-1/line_items?page=1&page_size=100`,
  ],
] as const;

for (const [name, trigger, collection, params, expectedUrl] of cases) {
  test(`${name} seeds, emits, retries, and requests the literal list`, async () => {
    const old = { id: "old" }, fresh = { id: "fresh" };
    const seed = mockCtx([{ body: page(collection, [old]) }]);
    const seeded = await trigger.poll!({ params, state: {} } as never, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, expectedUrl);

    const next = () => mockCtx([{ body: page(collection, [fresh, old]) }]).ctx;
    const result = await trigger.poll!({ params, state: seeded.nextState } as never, next());
    assertEquals(result.events, [fresh]);
    assertEquals(
      await trigger.poll!({ params, state: seeded.nextState } as never, next()),
      result,
    );
  });
}

const updatedCases = [
  ["new-or-updated-estimate", newOrUpdatedEstimate, "estimates", `${base}/estimates`],
  ["new-or-updated-invoice", newOrUpdatedInvoice, "invoices", `${base}/invoices`],
  ["new-or-updated-job", newOrUpdatedJob, "jobs", `${base}/jobs`],
  ["new-or-updated-lead", newOrUpdatedLead, "leads", `${base}/leads`],
] as const;

for (const [name, trigger, collection, path] of updatedCases) {
  test(`${name} emits an edited record and requests updated-at descending`, async () => {
    const old = { id: "old", updated_at: "2026-11-10T09:00:00Z" };
    const edited = { id: "old", updated_at: "2026-11-10T10:00:00Z" };
    const fresh = { id: "fresh", updated_at: "2026-11-10T11:00:00Z" };
    const seed = mockCtx([{ body: page(collection, [old]) }]);
    const seeded = await trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(
      seed.calls[0].url,
      `${path}?page=1&page_size=100&sort_by=updated_at&sort_direction=desc`,
    );
    const response = { body: page(collection, [fresh, edited]) };
    const result = await trigger.poll!(
      { params: {}, state: seeded.nextState } as never,
      mockCtx([response]).ctx,
    );
    assertEquals(result.events, [edited, fresh]);
    assertEquals(
      await trigger.poll!(
        { params: {}, state: seeded.nextState } as never,
        mockCtx([response]).ctx,
      ),
      result,
    );
  });
}
