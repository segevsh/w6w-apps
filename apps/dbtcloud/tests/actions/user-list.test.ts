import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/user-list.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };
const page = (data: unknown[], total = data.length) => ({
  status: 200,
  body: { data, extra: { pagination: { count: data.length, total_count: total } } },
});

/** dbt bills per developer seat; read-only and IT licences are free. */
Deno.test("user-list: counts the licence types, which is the number that costs money", async () => {
  const { ctx, calls } = mockCtx([page([
    { id: 1, licenses: [{ license_type: "developer" }] },
    { id: 2, licenses: [{ license_type: "read_only" }] },
    { id: 3, licenses: [{ license_type: "developer" }] },
  ])], { display });
  const result = await action.execute!({}, ctx) as {
    licenseCounts: Record<string, number>;
    count: number;
  };
  assertEquals(calls[0].url.split("?")[0], "https://ab123.us1.dbt.com/api/v3/accounts/42/users/");
  assertEquals(result.licenseCounts, { developer: 2, read_only: 1 });
  assertEquals(result.count, 3);
});

Deno.test("user-list: defaults to active users, and can include the deactivated", async () => {
  const active = mockCtx([page([])], { display });
  await action.execute!({}, active.ctx);
  assertEquals(new URL(active.calls[0].url).searchParams.get("state"), "active");

  const all = mockCtx([page([])], { display });
  await action.execute!({ state: "all" }, all.ctx);
  assertEquals(new URL(all.calls[0].url).searchParams.get("state"), "all");
});

/** A run log records the shape, not the people. */
Deno.test("user-list: logs a count, not the users", async () => {
  const { ctx, logs } = mockCtx([page([{ id: 1, email: "ada@acme.com" }])], { display });
  await action.execute!({}, ctx);
  assert(!JSON.stringify(logs).includes("ada@acme.com"), JSON.stringify(logs));
  assertEquals(logs[0].data, { count: 1 });
});

Deno.test("user-list: a user with no licence does not break the tally", async () => {
  const { ctx } = mockCtx([page([{ id: 1 }])], { display });
  const result = await action.execute!({}, ctx) as { licenseCounts: Record<string, number> };
  assertEquals(result.licenseCounts, {});
});
