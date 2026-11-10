import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newContact from "../../triggers/new-contact.ts";
import newInvoice from "../../triggers/new-invoice.ts";

const cases = [
  {
    key: "new-contact",
    trigger: newContact,
    params: {},
    url: "https://api.acculynx.com/api/v2/contacts/search?pageSize=100",
    body:
      '{"startDate":"1970-01-01T00:00:00Z","endDate":"9999-12-31T23:59:59Z","sort":{"sortDirection":"Descending","sortColumn":"CreatedDate"}}',
  },
  {
    key: "new-invoice",
    trigger: newInvoice,
    params: { jobId: "job-1" },
    url: "https://api.acculynx.com/api/v2/jobs/job-1/invoices?pageSize=100&sortOrder=Descending",
    body: null,
  },
];

for (const c of cases) {
  test(`${c.key}: seeds, emits, retries, and makes the literal list request`, async () => {
    const input = { params: c.params, subscriptionId: "sub-1" };
    const seed = mockCtx([{ body: { items: [{ id: "one" }] } }]);
    const seeded = await c.trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, c.body ? "POST" : "GET");
    assertEquals(seed.calls[0].url, c.url);
    assertEquals(seed.calls[0].body, c.body);

    const page = { items: [{ id: "two" }, { id: "one" }] };
    const first = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: page }]).ctx,
    );
    const retry = await c.trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: page }]).ctx,
    );
    assertEquals(first.events, [{ id: "two" }]);
    assertEquals(retry, first);
  });
}
