import { assertEquals } from "@std/assert";
import companyGet from "../../actions/company-get.ts";
import { assertRejects, GATEWAY_401, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("company-get: GET /company returns the profile and forwards fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "Empresa", applicationVersion: "colombia" } }]);
  const out = await companyGet.execute({ fields: "address" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v1/company");
  assertEquals(queryOf(calls[0].url), { fields: "address" });
  assertEquals(out, { name: "Empresa", applicationVersion: "colombia" });
});

Deno.test("company-get: no fields means no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await companyGet.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("company-get: the gateway's bare 401 surfaces as an error", async () => {
  const { ctx } = mockCtx([{ status: 401, body: GATEWAY_401 }]);
  await assertRejects(() => companyGet.execute({}, ctx), Error, "Alegra 401");
});
