import { assert, assertEquals, assertRejects } from "@std/assert";
import companyGet from "../../actions/company-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("company-get: GET /company returns the bare object", async () => {
  const { ctx, calls } = mockCtx([{ body: { accountId: "a1", name: "Acme", domain: "acme.io" } }]);
  const out = await companyGet.execute({}, ctx) as { name: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/public/v2/company");
  assertEquals(out.name, "Acme");
});

Deno.test("company-get: a 412 tells the user to accept Drata's terms in the web app", async () => {
  const { ctx } = mockCtx([{ status: 412, body: errorBody(412, "Terms not accepted", 9) }]);
  const err = await assertRejects(() => Promise.resolve(companyGet.execute({}, ctx)), Error);
  assert(err.message.includes("HTTP 412"), err.message);
  assert(err.message.includes("terms and conditions"), err.message);
});
