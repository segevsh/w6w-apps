import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import companyDelete from "../../actions/company-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("company-delete: DELETE /v1/companies/{companyId}/", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await companyDelete.execute({ companyId: "3" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/companies/3/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(result, { deleted: true, id: "3" });
});

test("company-delete: declares type perform", () => {
  assertEquals(companyDelete.type, "perform");
  assertEquals(companyDelete.idempotent, true);
});

test("company-delete: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await companyDelete.execute({ companyId: "3" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
