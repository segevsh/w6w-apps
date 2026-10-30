import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/cadence-membership-list.ts";

test("cadence-membership-list: GETs /cadence_memberships with query filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ cadenceId: 20, currentlyOnCadence: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/cadence_memberships");
  assertEquals(url.searchParams.get("cadence_id"), "20");
  assertEquals(url.searchParams.get("currently_on_cadence"), "true");
});
