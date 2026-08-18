import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/service-token-list.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };
const page = (data: unknown[]) => ({
  status: 200,
  body: { data, extra: { pagination: { count: data.length, total_count: data.length } } },
});

/** `last_used_at` is what finds the tokens to revoke. */
Deno.test("service-token-list: separates the tokens nothing has ever used", async () => {
  const { ctx, calls } = mockCtx([page([
    { id: 1, name: "airflow", last_used_at: "2026-08-17T00:00:00Z" },
    { id: 2, name: "old-migration", last_used_at: null },
    { id: 3, name: "unnamed-thing" },
  ])], { display });
  const result = await action.execute!({}, ctx) as { neverUsed: string[]; count: number };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://ab123.us1.dbt.com/api/v3/accounts/42/service-tokens/",
  );
  assertEquals(result.neverUsed, ["old-migration", "unnamed-thing"]);
  assertEquals(result.count, 3);
});

/** dbt shows a token's value once at creation and never again. */
Deno.test("service-token-list: says the response carries no secret, so it can be scheduled", () => {
  assert(/never returns a token's value/.test(action.description!), action.description);
});
