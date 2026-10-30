import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/framework-control-list.ts";

test("framework-control-list: reads one framework's controls", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "c1" }])], { display });
  const result = await action.execute!({ frameworkId: "soc2" }, ctx) as { count: number };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://api.vanta.com/v1/frameworks/soc2/controls",
  );
  assertEquals(result.count, 1);
});

test("framework-control-list: needs a framework id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "frameworkId");
  assertEquals(calls.length, 0);
});

/** The same control appears under several frameworks with different numbering. */
test("framework-control-list: says why this differs from a filtered control list", () => {
  assert(/different numbering/.test(action.description!), action.description);
});
