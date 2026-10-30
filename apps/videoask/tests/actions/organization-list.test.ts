import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import organizationList from "../../actions/organization-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("organization-list: GETs /organizations and passes the body through", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "org-1", name: "Acme" }] }]);
  const out = await organizationList.execute({}, ctx) as { result: unknown };
  assertEquals(pathOf(calls[0].url), "/organizations");
  assertEquals(out.result, [{ id: "org-1", name: "Acme" }]);
});
