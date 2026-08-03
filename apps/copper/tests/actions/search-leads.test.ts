import { assertEquals } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import action from "../../actions/search-leads.ts";

Deno.test("search-leads: POSTs to /leads/search", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/leads/search");
});

Deno.test("search-leads: maps every filter onto Copper's body keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({
    name: "My Lead",
    emails: "lead@example.com",
    phoneNumber: "4155551234",
    statusIds: [1],
    assigneeIds: [-2],
    customerSourceIds: [331242],
    tags: ["inbound"],
    city: "Savannah",
    state: "GA",
    country: "US",
    includeConvertedLeads: true,
    minimumCreatedDate: 1,
    maximumCreatedDate: 2,
    minimumModifiedDate: 3,
    maximumModifiedDate: 4,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    name: "My Lead",
    emails: "lead@example.com",
    phone_number: "4155551234",
    status_ids: [1],
    assignee_ids: [-2],
    customer_source_ids: [331242],
    tags: ["inbound"],
    city: "Savannah",
    state: "GA",
    country: "US",
    include_converted_leads: true,
    minimum_created_date: 1,
    maximum_created_date: 2,
    minimum_modified_date: 3,
    maximum_modified_date: 4,
  });
});

Deno.test("search-leads: `emails` is a single string here, unlike People's array", () => {
  // A Lead holds one email object; the filter mirrors that. The matching field
  // names make this an easy thing to get backwards.
  assertEquals(param(action, "emails").type, "string");
});

Deno.test("search-leads: exposes the converted-leads flag Copper defaults to false", () => {
  assertEquals(param(action, "includeConvertedLeads").type, "boolean");
});
