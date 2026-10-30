import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import organizationList from "../../actions/organization-list.ts";

test("organization-list: lists every visible organization when ids is omitted", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { organizations: [{ id: "1", name: "Acme" }] } },
  }]);
  const out = await organizationList.execute({}, ctx) as { organizations: unknown[] };
  assertEquals(out.organizations.length, 1);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.query, "{ organizations { id name } }");
});

test("organization-list: filters by ids when given", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { organizations: [] } } }]);
  await organizationList.execute({ ids: "12345, 987654" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.query, "{ organizations(ids: [12345, 987654]) { id name } }");
});

test("organization-list: type/resource metadata", () => {
  assertEquals(organizationList.type, "read");
  assertEquals(organizationList.resource, "organization");
});
