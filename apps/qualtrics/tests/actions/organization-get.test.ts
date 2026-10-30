import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import organizationGet from "../../actions/organization-get.ts";
import { API_ROOT, envelope, mockCtx } from "../_helpers.ts";

test("organization-get: calls the literal /organizations/current", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ organizationId: "org-1", name: "Acme" }) },
  ]);
  const out = await organizationGet.execute({}, ctx) as { organizationId: string };

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, `${API_ROOT}/organizations/current`);
  assertEquals(out.organizationId, "org-1");
});

test("organization-get: takes no params", () => {
  assertEquals(organizationGet.params, undefined);
});
