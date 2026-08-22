import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { page } from "./_shared.ts";
import action from "../../actions/transformation-list.ts";

Deno.test("transformation-list: separates the failing ones", async () => {
  const { ctx, calls } = mockCtx([page([
    { id: "t1", status: "SUCCEEDED" },
    { id: "t2", status: "FAILED" },
    { id: "t3", status: "ERRORED" },
  ])]);
  const result = await action.execute!({}, ctx) as { count: number; failing: string[] };
  assertEquals(calls[0].url.split("?")[0], "https://api.fivetran.com/v1/transformations");
  assertEquals(result.count, 3);
  assertEquals(result.failing, ["t2", "t3"]);
});

/** Fivetran versions its Quickstart packages and can upgrade them. */
Deno.test("transformation-list: says Fivetran can upgrade its own packages", () => {
  assert(/upgrade under you/.test(action.description!), action.description);
});
