import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/monitored-computer-list.ts";

test("monitored-computer-list: reads the fleet", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "m1" }])], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(calls[0].url.split("?")[0], "https://api.vanta.com/v1/monitored-computers");
  assertEquals(result.count, 1);
});

test("monitored-computer-list: the status filter is sent as repeated keys", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ complianceStatuses: "NON_COMPLIANT, UNKNOWN" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.getAll("complianceStatusFilterMatchesAny"),
    ["NON_COMPLIANT", "UNKNOWN"],
  );
});

test("monitored-computer-list: logs a count, not the fleet", async () => {
  const { ctx, logs } = mockCtx([page([{ id: "m1", ownerName: "Ada" }])], { display });
  await action.execute!({}, ctx);
  assertEquals(logs[0].data, { count: 1 });
});

/** A machine that stopped reporting has no state, and no failure to count. */
test("monitored-computer-list: names the absent-computer trap", () => {
  assert(/stopped reporting/.test(action.description!), action.description);
});
