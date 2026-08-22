import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/environment-list.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };
const page = (data: unknown[], total = data.length) => ({
  status: 200,
  body: { data, extra: { pagination: { count: data.length, total_count: total } } },
});

Deno.test("environment-list: reads a project's environments from v3", async () => {
  const { ctx, calls } = mockCtx([page([{ id: 5, deployment_type: "production" }])], { display });
  const result = await action.execute!({ projectId: "3" }, ctx) as { count: number };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://ab123.us1.dbt.com/api/v3/accounts/42/projects/3/environments/",
  );
  assertEquals(result.count, 1);
});

/** "Did anything fail in production" is a different question from "did anything fail". */
Deno.test("environment-list: filters by deployment type when asked", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ projectId: "3", deploymentType: "production" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("deployment_type"), "production");
});

Deno.test("environment-list: an unset deployment type sends no filter", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ projectId: "3", deploymentType: "" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("deployment_type"), null);
});

Deno.test("environment-list: needs a project id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "projectId");
  assertEquals(calls.length, 0);
});

Deno.test("environment-list: says why the deployment type matters", () => {
  assert(/alarming/.test(action.description!), action.description);
});
