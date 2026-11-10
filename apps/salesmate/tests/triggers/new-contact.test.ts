import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockSalesmateCtx } from "../_helpers.ts";
import newContact from "../../triggers/new-contact.ts";
import newOrUpdatedContact from "../../triggers/new-or-updated-contact.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: number, lastModifiedAt = "2026-11-09T12:00:00Z") => ({ id, lastModifiedAt });
const response = (records: unknown[]) => ({ Status: "success", Data: { data: records } });

test("Salesmate contact triggers seed, emit, retry, and request literal sorts", async () => {
  for (
    const [trigger, url, sortField] of [
      [
        newContact,
        "https://acme.salesmate.io/apis/contact/v4/search?rows=100&from=0",
        "contact.createdAt",
      ],
      [
        newOrUpdatedContact,
        "https://acme.salesmate.io/apis/contact/v4/search?rows=100&from=0",
        "contact.lastModifiedAt",
      ],
    ] as const
  ) {
    const seed = mockSalesmateCtx([{ body: response([item(1)]) }]);
    const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seed.calls[0].method, "POST");
    assertEquals(seed.calls[0].url, url);
    assertEquals(JSON.parse(seed.calls[0].body!), {
      displayingFields: [
        "contact.id",
        "contact.name",
        "contact.firstName",
        "contact.lastName",
        "contact.email",
        "contact.mobile",
        "contact.designation",
        "contact.company.id",
        "contact.company.name",
        "contact.tags",
        "contact.billingCity",
        "contact.billingCountry",
        "contact.lastModifiedAt",
      ],
      filterQuery: {
        group: {
          operator: "AND",
          rules: [{
            condition: "IS_AFTER",
            moduleName: "Contact",
            field: { fieldName: "contact.createdAt", displayName: "Created At", type: "DateTime" },
            data: "Jan 01, 1970 05:30 AM",
            eventType: "DateTime",
          }],
        },
      },
      sort: { fieldName: sortField, order: "desc" },
      moduleId: 1,
      reportType: "get_data",
      getRecordsCount: true,
    });
    const page = response([item(2), item(1)]);
    const first = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockSalesmateCtx([{ body: page }]).ctx,
    );
    const retry = await trigger.poll!(
      { ...input, state: seeded.nextState },
      mockSalesmateCtx([{ body: page }]).ctx,
    );
    assertEquals(first.events, [item(2)]);
    assertEquals(retry, first);
  }
});
