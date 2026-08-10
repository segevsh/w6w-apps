import { assert, assertEquals, assertThrows } from "@std/assert";
import { data, gqlOf, mockCtx, optionValues } from "../_helpers.ts";
import ideaList from "../../actions/idea-list.ts";

const empty = () => data({ ideas: { edges: [], pageInfo: {} } });

Deno.test("idea-list: first and after are field arguments beside input", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await ideaList.execute({ organizationId: "o1", first: 10, after: "cur" }, ctx);
  const { query, variables } = gqlOf(calls[0]);
  assertEquals(variables, { input: { organizationId: "o1" }, first: 10, after: "cur" });
  assert(/\$input: IdeasInput!, \$first: Int, \$after: String/.test(query), query);
});

Deno.test("idea-list: no groupFilter at all means every group — not a null field", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await ideaList.execute({ organizationId: "o1" }, ctx);
  assertEquals(gqlOf(calls[0]).variables, { input: { organizationId: "o1" } });
});

Deno.test("idea-list: group ids and membership are mutually exclusive — @oneOf", () => {
  const { ctx, calls } = mockCtx([]);
  const err = assertThrows(
    () => ideaList.execute({ organizationId: "o1", groupIds: "g1", membership: "grouped" }, ctx),
    Error,
  );
  // The server-side @oneOf violation does not name the two fields; this does.
  assert(/@oneOf/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("idea-list: group ids become groupFilter.groups", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await ideaList.execute({ organizationId: "o1", groupIds: "g1,g2" }, ctx);
  assertEquals(
    (gqlOf(calls[0]).variables as { input: { groupFilter: unknown } }).input.groupFilter,
    { groups: ["g1", "g2"] },
  );
});

Deno.test("idea-list: membership becomes groupFilter.membership", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await ideaList.execute({ organizationId: "o1", membership: "ungrouped" }, ctx);
  assertEquals(
    (gqlOf(calls[0]).variables as { input: { groupFilter: unknown } }).input.groupFilter,
    { membership: "ungrouped" },
  );
});

Deno.test("idea-list: the membership options are Buffer's two", () => {
  assertEquals(optionValues(ideaList, "membership"), ["ungrouped", "grouped"]);
});

/**
 * `TagComparator.in` is non-null, so "untagged only" cannot be expressed by
 * omitting `in` — it has to be an explicit empty array. This is the one place
 * the app sends `[]` deliberately.
 */
Deno.test("idea-list: untagged-only sends an explicit empty `in` plus isEmpty", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await ideaList.execute({ organizationId: "o1", untaggedOnly: true }, ctx);
  assertEquals(
    (gqlOf(calls[0]).variables as { input: { tagsFilter: unknown } }).input.tagsFilter,
    { in: [], isEmpty: true },
  );
});

Deno.test("idea-list: tags and untagged combine into a union", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await ideaList.execute({ organizationId: "o1", tagIds: "t1", untaggedOnly: true }, ctx);
  assertEquals(
    (gqlOf(calls[0]).variables as { input: { tagsFilter: unknown } }).input.tagsFilter,
    { in: ["t1"], isEmpty: true },
  );
});

Deno.test("idea-list: no tag filter is invented when neither is set", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await ideaList.execute({ organizationId: "o1" }, ctx);
  assertEquals(
    "tagsFilter" in (gqlOf(calls[0]).variables as { input: object }).input,
    false,
  );
});
