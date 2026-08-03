import { assert, assertEquals } from "@std/assert";
import { API, data, gqlOf, mockCtx } from "../_helpers.ts";
import organizationList from "../../actions/organization-list.ts";

Deno.test("organization-list: POSTs the account query with no variables", async () => {
  const { ctx, calls } = mockCtx([
    data({ account: { id: "a1", organizations: [{ id: "o1", name: "Acme" }] } }),
  ]);
  const out = await organizationList.execute({}, ctx);
  assertEquals(calls[0].url, API);
  assertEquals(calls[0].method, "POST");
  assertEquals(gqlOf(calls[0]).variables, {});
  assertEquals((out as { account: { organizations: unknown[] } }).account.organizations.length, 1);
});

Deno.test("organization-list: reaches organizations through account — there is no root query", async () => {
  const { ctx, calls } = mockCtx([data({ account: { id: "a1", organizations: [] } })]);
  await organizationList.execute({}, ctx);
  const { query } = gqlOf(calls[0]);
  assert(/account\s*\{/.test(query), query);
  assert(/organizations\s*\{/.test(query), query);
});

Deno.test("organization-list: does not pull Organization.limits", async () => {
  const { ctx, calls } = mockCtx([data({ account: { id: "a1", organizations: [] } })]);
  await organizationList.execute({}, ctx);
  // A nested plan-ceiling object on every call, to answer a question this
  // action is not about. `daily-posting-limit-list` covers the limit that bites.
  assert(!/\blimits\b/.test(gqlOf(calls[0]).query));
});

Deno.test("organization-list: takes no params — it is the prerequisite for everything else", () => {
  assertEquals(organizationList.params, []);
  assertEquals(organizationList.type, "read");
});
