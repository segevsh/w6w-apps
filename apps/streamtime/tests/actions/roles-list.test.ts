import { assert, assertEquals } from "@std/assert";
import rolesList from "../../actions/roles-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("roles-list: reads GET /v2/roles", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Designer", active: true }] }]);
  const result = await rolesList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/roles");
  assertEquals(result, { roles: [{ id: 1, name: "Designer", active: true }] });
});

/**
 * Streamtime documents `include_archived` with a default of false, and says
 * nothing about how it parses a false value — so the flag is expressed as
 * absence unless the caller asks for archived roles.
 */
Deno.test("roles-list: archived roles are only requested when asked for", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }, { body: [] }]);
  await rolesList.execute({}, ctx);
  assert(!("include_archived" in queryOf(calls[0].url)));

  await rolesList.execute({ includeArchived: true }, ctx);
  assertEquals(queryOf(calls[1].url).include_archived, "true");
});
