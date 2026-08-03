import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues, param, run } from "../_helpers.ts";
import action from "../../actions/search-people.ts";

Deno.test("search-people: POSTs to /people/search — Copper has no GET collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 7 }] }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/people/search");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("search-people: maps every filter onto Copper's snake_case body keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({
    name: "Jim",
    emails: ["jim@example.com"],
    phoneNumber: "4085551234",
    assigneeIds: [1, -2],
    companyIds: [2],
    contactTypeIds: [3],
    tags: ["vip"],
    city: "Vancouver",
    state: "BC",
    country: "CA",
    minimumCreatedDate: 1_400_000_000,
    maximumCreatedDate: 1_500_000_000,
    pageNumber: 2,
    pageSize: 200,
    sortBy: "date_modified",
    sortDirection: "desc",
  }, ctx);

  assertEquals(JSON.parse(calls[0].body!), {
    name: "Jim",
    emails: ["jim@example.com"],
    phone_number: "4085551234",
    assignee_ids: [1, -2],
    company_ids: [2],
    contact_type_ids: [3],
    tags: ["vip"],
    city: "Vancouver",
    state: "BC",
    country: "CA",
    minimum_created_date: 1_400_000_000,
    maximum_created_date: 1_500_000_000,
    page_number: 2,
    page_size: 200,
    sort_by: "date_modified",
    sort_direction: "desc",
  });
});

Deno.test("search-people: omits filters that were not supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({ name: "Jim" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "Jim" });
});

Deno.test("search-people: returns the bare array plus the header total", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: [{ id: 7, name: "Jim Halpert" }],
    headers: { "content-type": "application/json", "x-pw-total": "775" },
  }]);
  const out = await run<{ records: unknown[]; total?: number }>(action, {}, ctx);
  assertEquals(out.records, [{ id: 7, name: "Jim Halpert" }]);
  assertEquals(out.total, 775);
});

Deno.test("search-people: is a search action and offers the shared paging params", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "person");
  for (const key of ["pageNumber", "pageSize", "sortBy", "sortDirection"]) {
    assert(param(action, key), `missing ${key}`);
  }
  assertEquals(optionValues(action, "sortDirection"), ["asc", "desc"]);
});

Deno.test("search-people: caps the page size at Copper's documented 200", () => {
  assertEquals(param(action, "pageSize").validation?.max, 200);
});
