import { assertEquals, assertRejects } from "@std/assert";
import companyList from "../../actions/company-list.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("company-list: GET /companies with every filter, sort, include and page serialised", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "data": [{ "id": "1", "type": "companies", "attributes": { "name": "x" } }],
      "meta": { "total_count": 1, "current_page": 1, "total_pages": 1, "page_size": 30 },
      "links": {},
    },
  }]);
  const out = await companyList.execute({
    "query": "sample query",
    "status": 1,
    "name": "sample name",
    "companyCode": "sample companyCode",
    "sort": "-name",
    "include": "company",
    "pageSize": 5,
    "pageNumber": 2,
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/companies");
  assertEquals(queryOf(calls[0].url), {
    "filter[query]": "sample query",
    "filter[status]": "1",
    "filter[name]": "sample name",
    "filter[company_code]": "sample companyCode",
    "sort": "-name",
    "include": "company",
    "page[size]": "5",
    "page[number]": "2",
  });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
  assertEquals(calls[0].headers["x-auth-token"], undefined, "credentials belong to sign");
  assertEquals(calls[0].headers["x-organization-id"], undefined);
  assertEquals(out.count, 1);
  assertEquals(out.totalCount, 1);
  assertEquals(out.hasMore, false);
  assertEquals((out.items as Record<string, unknown>[])[0].id, "1");
  assertEquals((out.items as Record<string, unknown>[])[0].name, "x");
});

Deno.test("company-list: a next link becomes nextCursor, and the cursor is sent back as page[after]", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        data: [],
        links: { next: "https://api.productive.io/api/v2/companies?page%5Bafter%5D=abc123" },
      },
    },
    { status: 200, body: { data: [] } },
  ]);
  const first = await companyList.execute({ cursorPaging: true, pageSize: 2 }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(queryOf(calls[0].url), { "page[after]": "", "page[size]": "2" });
  assertEquals(first.hasMore, true);
  assertEquals(first.nextCursor, "abc123");
  await companyList.execute({ cursor: "abc123" }, ctx);
  assertEquals(queryOf(calls[1].url), { "page[after]": "abc123" });
});

Deno.test("company-list: a raw filter object is merged with the typed filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await companyList.execute({ filter: '{"name": {"contains": "x"}, "id": [1, 2]}' }, ctx);
  assertEquals(queryOf(calls[0].url), { "filter[name][contains]": "x", "filter[id]": "1,2" });
});

Deno.test("company-list: a vendor error surfaces its status, title and detail", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("422", "unprocessable_entity", "Invalid", "is invalid"),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(companyList.execute({}, ctx)),
    Error,
  );
  assertEquals(err.message.includes("422"), true, err.message);
  assertEquals(err.message.includes("is invalid"), true, err.message);
});

Deno.test("company-list: declares search", () => {
  assertEquals(companyList.type, "search");
  assertEquals(companyList.idempotent, undefined);
  assertEquals(companyList.key, "company-list");
});
