import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import organizationGet from "../../actions/organization-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("organization-get: calls GET /organizations/{organizationKey}", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "Kittens r Us" } }]);
  await organizationGet.execute({ organizationKey: "o1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/organizations/o1");
});
