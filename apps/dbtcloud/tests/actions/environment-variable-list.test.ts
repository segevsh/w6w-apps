import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/environment-variable-list.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };

const matrix = {
  status: 200,
  body: {
    data: {
      environments: ["project", "production", "staging"],
      variables: {
        DBT_ENV_SECRET_KEY: {
          project: { id: 1, value: "**********" },
          production: { id: 2, value: "**********" },
        },
        DBT_CUSTOM_REGION: {
          project: { id: 3, value: "eu" },
          staging: { id: 4, value: "eu-test" },
        },
      },
    },
  },
};

Deno.test("environment-variable-list: returns the per-environment matrix", async () => {
  const { ctx, calls } = mockCtx([matrix], { display });
  const result = await action.execute!({ projectId: "3" }, ctx) as {
    environments: string[];
    count: number;
  };
  assertEquals(
    calls[0].url,
    "https://ab123.us1.dbt.com/api/v3/accounts/42/projects/3/environment-variables/environment/",
  );
  assertEquals(result.environments, ["project", "production", "staging"]);
  assertEquals(result.count, 2);
});

/**
 * dbt masks a secret's value, which is what makes this safe to hand to a
 * configuration audit — the NAME is the information a drift check needs.
 */
Deno.test("environment-variable-list: names the masked variables without their values", async () => {
  const { ctx } = mockCtx([matrix], { display });
  const result = await action.execute!({ projectId: "3" }, ctx) as { secretNames: string[] };
  assertEquals(result.secretNames, ["DBT_ENV_SECRET_KEY"]);
});

Deno.test("environment-variable-list: a project with no variables reports empties", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: {} } }], { display });
  const result = await action.execute!({ projectId: "3" }, ctx) as {
    count: number;
    secretNames: string[];
    environments: string[];
  };
  assertEquals(result.count, 0);
  assertEquals(result.secretNames, []);
  assertEquals(result.environments, []);
});

Deno.test("environment-variable-list: needs a project id", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "projectId");
  assertEquals(calls.length, 0);
});

Deno.test("environment-variable-list: says the values come back masked", () => {
  assert(/masked/.test(action.description!), action.description);
});
