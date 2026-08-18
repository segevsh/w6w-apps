import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/cohort-list.ts";

Deno.test("cohort-list: returns the definitions and a rough total", async () => {
  const { ctx, calls } = mockCtx([
    ok({
      cohorts: [
        { id: "a", name: "Power users", size: 1200, last_computed: 1 },
        { id: "b", name: "Churn risk", size: 340, last_computed: 2 },
      ],
    }),
  ], { display });
  const result = await action.execute!({}, ctx) as {
    count: number;
    totalMembers: number;
    names: string[];
  };
  assertEquals(new URL(calls[0].url).pathname, "/api/3/cohorts");
  assertEquals(result.count, 2);
  assertEquals(result.totalMembers, 1540);
  assertEquals(result.names, ["Power users", "Churn risk"]);
});

Deno.test("cohort-list: a cohort with no size does not make the total NaN", async () => {
  const { ctx } = mockCtx([ok({ cohorts: [{ id: "a" }, { id: "b", size: 10 }] })], { display });
  const result = await action.execute!({}, ctx) as { totalMembers: number };
  assertEquals(result.totalMembers, 10);
});

Deno.test("cohort-list: no cohorts is a count of zero", async () => {
  const { ctx } = mockCtx([ok({ cohorts: [] })], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(result.count, 0);
});

Deno.test("cohort-list: takes no parameters", () => {
  assertEquals(action.params?.length ?? 0, 0);
});

/** Sizes are snapshots from each cohort's own last computation. */
Deno.test("cohort-list: says size is as of the last recomputation", () => {
  assert(/last recomputation/.test(action.description!), action.description);
});
