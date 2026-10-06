import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/company-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("company-get: GETs /companies/{id} and returns the record untouched", async () => {
  const { ctx, calls } = mockCtx([{ body: { slug: "42", first_name: "Ada" } }]);
  const out = await action.execute({ companyId: " 42 " }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/companies/42");
  assertEquals(out, { slug: "42", first_name: "Ada" });
});

Deno.test("company-get: requires an id without calling the API", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await (action.execute({ companyId: "" }, ctx)), Error, "id");
  assertEquals(calls.length, 0);
});

Deno.test("company-get: a 404 carries the vendor's errorCode and message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: true, errorCode: "not_found", errorMessage: "No such record" },
  }]);
  await assertRejects(
    async () => await (action.execute({ companyId: "9" }, ctx)),
    Error,
    "404 not_found for GET /v1/companies/9: No such record",
  );
});
