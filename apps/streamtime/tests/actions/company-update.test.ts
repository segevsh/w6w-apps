import { assertEquals } from "@std/assert";
import companyUpdate from "../../actions/company-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("company-update: PUTs the changed fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 2001, name: "Acme Ltd" } }]);
  await companyUpdate.execute({
    companyId: 2001,
    name: "Acme Ltd",
    websiteAddress: "https://acme.co",
  }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/companies/2001");
  assertEquals(bodyOf(calls[0]), { name: "Acme Ltd", websiteAddress: "https://acme.co" });
});

/**
 * The schema marks `branchId`, `rateCardId`, `companyLeadUserId` and `notes`
 * read-only, so they are not params and cannot leak into the body.
 */
Deno.test("company-update: read-only fields cannot be sent", () => {
  const keys = (companyUpdate.params ?? []).map((p) => p.key);
  for (const readonly of ["branchId", "rateCardId", "companyLeadUserId", "notes"]) {
    assertEquals(keys.includes(readonly), false, readonly);
  }
});
