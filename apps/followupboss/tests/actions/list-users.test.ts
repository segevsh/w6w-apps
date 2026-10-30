import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import listUsers from "../../actions/list-users.ts";

test("list-users: GETs /users and offers only the three wire roles", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { _metadata: { collection: "users" }, users: [{ id: 1 }] },
  }]);
  await listUsers.execute({ role: "Broker", fields: "id,name,calling" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("role"), "Broker");
  assertEquals(url.searchParams.get("fields"), "id,name,calling");
  assertEquals(optionValues(listUsers, "role"), ["Agent", "Broker", "Lender"]);
});

test("list-users: explains that Owner vs Admin is isOwner, not a role", () => {
  assert(/isOwner/.test(listUsers.description!), listUsers.description);
  assert(param(listUsers, "fields").hint?.includes("Calling information"));
});

/**
 * The lower-cased collection key is the trap this endpoint is most likely to
 * spring, so it is exercised end to end rather than only in the lib test.
 */
