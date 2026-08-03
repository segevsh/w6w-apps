import { assert, assertEquals } from "@std/assert";
import { data, gqlOf, mockCtx } from "../_helpers.ts";
import ideaGroupList from "../../actions/idea-group-list.ts";

Deno.test("idea-group-list: IdeaGroupsInput takes only an organization id", async () => {
  const { ctx, calls } = mockCtx([data({ ideaGroups: [] })]);
  await ideaGroupList.execute({ organizationId: "o1" }, ctx);
  assertEquals(gqlOf(calls[0]).variables, { input: { organizationId: "o1" } });
});

Deno.test("idea-group-list: returns a plain list — no pagination to invent", async () => {
  const { ctx, calls } = mockCtx([data({ ideaGroups: [{ id: "g1" }] })]);
  await ideaGroupList.execute({ organizationId: "o1" }, ctx);
  const { query } = gqlOf(calls[0]);
  assert(!/edges|pageInfo|\$first|\$after/.test(query), query);
});

Deno.test("idea-group-list: selects all three IdeaGroup fields", async () => {
  const { ctx, calls } = mockCtx([data({ ideaGroups: [] })]);
  await ideaGroupList.execute({ organizationId: "o1" }, ctx);
  const { query } = gqlOf(calls[0]);
  for (const f of ["id", "name", "isLocked"]) assert(new RegExp(`\\b${f}\\b`).test(query), f);
});

Deno.test("idea-group-list: read-only, and the description says why", () => {
  assertEquals(ideaGroupList.type, "read");
  // The schema has no createIdeaGroup / rename / delete anywhere.
  assert(/no mutation/i.test(ideaGroupList.description!), ideaGroupList.description);
});
