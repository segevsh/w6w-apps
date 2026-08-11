import { assert, assertEquals } from "@std/assert";
import listGroups from "../../actions/list-groups.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/**
 * "Expenses that are not associated with a group are listed in a group with ID
 * 0." The synthetic entry is passed through rather than filtered, because it is
 * the only handle on those expenses — but a workflow iterating groups must skip
 * it.
 */
Deno.test("list-groups: passes through the synthetic group 0", async () => {
  const { ctx, calls } = mockCtx([{
    body: { groups: [{ id: 0, name: "Non-group expenses" }, { id: 321, name: "Housemates" }] },
  }]);
  const out = await listGroups.execute({}, ctx) as { groups: Array<{ id: number }> };

  assertEquals(pathOf(calls[0].url), "/api/v3.0/get_groups");
  assertEquals(out.groups.length, 2);
  assert(out.groups.some((g) => g.id === 0), "group 0 was filtered out");
});

Deno.test("list-groups: takes no params — the endpoint has no pagination", () => {
  assertEquals(listGroups.params?.length, 0);
});

Deno.test("list-groups: a missing key yields an empty list", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await listGroups.execute({}, ctx), { groups: [] });
});
