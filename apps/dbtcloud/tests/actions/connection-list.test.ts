import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/connection-list.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };
const page = (data: unknown[], total = data.length) => ({
  status: 200,
  body: { data, extra: { pagination: { count: data.length, total_count: total } } },
});

Deno.test("connection-list: reads every warehouse connection in the account by default", async () => {
  const { ctx, calls } = mockCtx([page([{ id: 1, type: "snowflake" }])], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://ab123.us1.dbt.com/api/v3/accounts/42/connections/",
  );
  assertEquals(result.count, 1);
});

Deno.test("connection-list: a project scopes it to that project's own path", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ projectId: "3" }, ctx);
  assertEquals(
    calls[0].url.split("?")[0],
    "https://ab123.us1.dbt.com/api/v3/accounts/42/projects/3/connections/",
  );
});

/** A connection here is a warehouse, not an authentication link. */
Deno.test("connection-list: says what a connection is, and what it does not carry", () => {
  assert(/data warehouses/.test(action.description!), action.description);
  assert(/not its credentials/.test(action.description!), action.description);
});
