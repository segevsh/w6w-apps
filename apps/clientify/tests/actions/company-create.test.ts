import { assertEquals } from "@std/assert";
import companyCreate from "../../actions/company-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("company-create: POST /v1/companies/", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 3, name: "Acme" } }]);
  const result = await companyCreate.execute({
    name: "Acme",
    numberOfEmployees: 2,
    emails: [{ email: "team@acme.test" }],
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/companies/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body as string), {
    name: "Acme",
    number_of_employees: 2,
    emails: [{ email: "team@acme.test" }],
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, { id: 3, name: "Acme" });
});

Deno.test("company-create: declares type perform", () => {
  assertEquals(companyCreate.type, "perform");
  assertEquals(companyCreate.idempotent, false);
});

Deno.test("company-create: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await companyCreate.execute({
      name: "Acme",
      numberOfEmployees: 2,
      emails: [{ email: "team@acme.test" }],
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
