import { assertEquals } from "@std/assert";
import companyUpdate from "../../actions/company-update.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("company-update: PUT /v1/companies/{companyId}/", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 3, name: "Acme 2" } }]);
  const result = await companyUpdate.execute({ companyId: "3", name: "Acme 2" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/companies/3/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body as string), { name: "Acme 2" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, { id: 3, name: "Acme 2" });
});

Deno.test("company-update: declares type perform", () => {
  assertEquals(companyUpdate.type, "perform");
  assertEquals(companyUpdate.idempotent, true);
});

Deno.test("company-update: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await companyUpdate.execute({ companyId: "3", name: "Acme 2" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
