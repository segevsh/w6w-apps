import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { page } from "./_shared.ts";
import action from "../../actions/transformation-project-list.ts";

Deno.test("transformation-project-list: reads the dbt projects", async () => {
  const { ctx, calls } = mockCtx([page([
    { id: "p1", type: "DBT_GIT", project_config: { git_branch: "main" } },
  ])]);
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://api.fivetran.com/v1/transformation-projects",
  );
  assertEquals(result.count, 1);
});

/** "The models changed and nobody deployed" is a project tracking main. */
Deno.test("transformation-project-list: names what the branch explains", () => {
  assert(/tracking main/.test(action.description!), action.description);
});
