import { assertEquals } from "@std/assert";
import listCompanies from "../../actions/list-companies.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-companies: GET /companies with name filter and paging", async () => {
  const { ctx, calls } = mockCtx([{
    body: listEnvelope("companies", [{ company: { id: "co1" } }]),
  }]);
  const out = await listCompanies.execute(
    { name: "Acme", sortBy: "name", perPage: 100 },
    ctx,
  ) as Record<
    string,
    unknown
  >;
  assertEquals(pathOf(calls[0].url), "/api/v3/companies");
  assertEquals(queryOf(calls[0].url), { name: "Acme", sort_by: "name", per_page: "100" });
  assertEquals(out.items, [{ company: { id: "co1" } }]);
  assertEquals(out.maxPage, 1);
});

Deno.test("list-companies: missing list key yields an empty page, not a crash", async () => {
  const { ctx } = mockCtx([{ body: { status: 0, data: {} } }]);
  const out = await listCompanies.execute({}, ctx) as Record<string, unknown>;
  assertEquals(out.items, []);
});
