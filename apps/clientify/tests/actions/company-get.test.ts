import { assertEquals } from "@std/assert";
import companyGet from "../../actions/company-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("company-get: GET /v1/companies/{companyId}/", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 3, name: "Acme" } }]);
  const result = await companyGet.execute({ companyId: "3" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/companies/3/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(result, { id: 3, name: "Acme" });
});

Deno.test("company-get: declares type read", () => {
  assertEquals(companyGet.type, "read");
});

Deno.test("company-get: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await companyGet.execute({ companyId: "3" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
