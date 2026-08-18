import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-get.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };

Deno.test("project-get: fetches one project from v3", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { data: { id: 3, name: "analytics", repository: { id: 1 } } } }],
    { display },
  );
  const result = await action.execute!({ projectId: "3" }, ctx) as { name: string };
  assertEquals(calls[0].url, "https://ab123.us1.dbt.com/api/v3/accounts/42/projects/3/");
  assertEquals(result.name, "analytics");
});

Deno.test("project-get: needs a project id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "projectId");
  assertEquals(calls.length, 0);
});

/** Where the models come from and where they are built — the lineage question. */
Deno.test("project-get: names the repository and the warehouse as the point", () => {
  assert(/repository/.test(action.description!), action.description);
  assert(/warehouse/.test(action.description!), action.description);
});
