import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import organizationGet from "../../actions/organization-get.ts";
import { mockCtx, odataList, pathOf } from "../_helpers.ts";

test("organization-get: calls GET /v1/Organizations and returns the first row", async () => {
  const { ctx, calls } = mockCtx([{ body: odataList([{ id: "org-1", name: "Acme" }]) }]);
  const out = await organizationGet.execute({}, ctx) as { id: string };
  assertEquals(pathOf(calls[0].url), "/v1/Organizations");
  assertEquals(out.id, "org-1");
});

test("organization-get: returns null rather than throwing when the list is empty", async () => {
  const { ctx } = mockCtx([{ body: odataList([]) }]);
  const out = await organizationGet.execute({}, ctx);
  assertEquals(out, null);
});
