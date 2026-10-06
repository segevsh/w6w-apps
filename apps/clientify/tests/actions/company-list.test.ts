import { assertEquals } from "@std/assert";
import companyList from "../../actions/company-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("company-list: GET /v1/companies/", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { count: 1, next: null, previous: null, results: [{ id: 3, name: "Acme" }] },
  }]);
  const result = await companyList.execute({ query: "acme", page: 1 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/companies/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), { query: "acme", page: "1" });
  assertEquals(calls[0].body, null);
  assertEquals(result, {
    count: 1,
    next: null,
    previous: null,
    results: [{ id: 3, name: "Acme" }],
  });
});

Deno.test("company-list: declares type search", () => {
  assertEquals(companyList.type, "search");
});

Deno.test("company-list: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await companyList.execute({ query: "acme", page: 1 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
