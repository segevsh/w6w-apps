import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import companyList from "../../actions/company-list.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "page": 2,
  "search": "acme",
  "internal_id": "C-1",
  "type": "customer",
  "siret": "12345678900011",
  "address_city": "Paris",
  "address_zipcode": "75001",
  "is_prospect": true,
  "is_customer": true,
  "is_supplier": false,
  "is_disabled": false,
  "sort": "name",
};

Deno.test("company-list: GET /api/v2/companies with the documented query, header and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ "id": 1 }, { "id": 2 }] }]);
  const out = await companyList.execute(INPUT as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/companies");
  assertEquals(queryOf(calls[0].url), {
    "search": "acme",
    "internal_id": "C-1",
    "type": "customer",
    "siret": "12345678900011",
    "address_city": "Paris",
    "address_zipcode": "75001",
    "is_prospect": "true",
    "is_customer": "true",
    "is_supplier": "false",
    "is_disabled": "false",
    "sort": "name",
  });
  assertEquals(calls[0].headers["page"], "2");
  assertEquals(calls[0].body, null);
  assertEquals(
    calls[0].headers["userapikey"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { items: [{ id: 1 }, { id: 2 }], count: 2, page: 2, nextPage: 3 });
});

Deno.test("company-list: an Axonaut error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Forbidden access") }]);
  const err = await assertRejects(async () => await companyList.execute(INPUT as never, ctx));
  assertStringIncludes((err as Error).message, "Axonaut 403: Forbidden access");
});

Deno.test("company-list: an empty page ends the list and the first page is the default", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  const out = await companyList.execute({} as never, ctx);
  assertEquals(calls[0].headers["page"], undefined);
  assertEquals(out, { items: [], count: 0, page: 1, nextPage: null });
});
