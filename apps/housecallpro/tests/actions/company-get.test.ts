import { assertEquals } from "@std/assert";
import companyGet from "../../actions/company-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("company-get: calls GET /company", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "co1", name: "Acme Plumbing", locations: [{ id: "loc-1" }] } },
  ]);
  const out = await companyGet.execute({}, ctx) as { name: string; locations: unknown[] };

  assertEquals(pathOf(calls[0].url), "/company");
  assertEquals(out.name, "Acme Plumbing");
  assertEquals(out.locations.length, 1);
});

Deno.test("company-get: sends the location header when one is selected", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await companyGet.execute({ companyId: "loc-2" }, ctx);
  assertEquals(calls[0].headers["x-company-id"], "loc-2");
});

Deno.test("company-get: has no required params, so a host can invoke it with {}", () => {
  assertEquals((companyGet.params ?? []).filter((p) => p.required).length, 0);
});
