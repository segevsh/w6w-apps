import { assertEquals } from "@std/assert";
import { mockCtx, param, run } from "../_helpers.ts";
import action from "../../actions/search-companies.ts";

Deno.test("search-companies: POSTs to /companies/search", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/companies/search");
});

Deno.test("search-companies: maps every filter onto Copper's body keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({
    name: "Acme",
    emailDomains: ["acme.com"],
    phoneNumber: "4155551234",
    assigneeIds: [-2],
    contactTypeIds: [3],
    tags: ["partner"],
    city: "Savannah",
    state: "GA",
    country: "US",
    minimumCreatedDate: 1,
    maximumCreatedDate: 2,
    pageSize: 25,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Acme",
    email_domains: ["acme.com"],
    phone_number: "4155551234",
    assignee_ids: [-2],
    contact_type_ids: [3],
    tags: ["partner"],
    city: "Savannah",
    state: "GA",
    country: "US",
    minimum_created_date: 1,
    maximum_created_date: 2,
    page_size: 25,
  });
});

Deno.test("search-companies: returns records and the header total", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [{ id: 2 }],
    headers: { "content-type": "application/json", "x-pw-total": "3" },
  }]);
  const out = await run<{ records: unknown[]; total?: number }>(action, {}, ctx);
  assertEquals(out.records, [{ id: 2 }]);
  assertEquals(out.total, 3);
});

Deno.test("search-companies: is a search on the company resource", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "company");
  assertEquals(param(action, "country").validation?.maxLength, 2);
});
