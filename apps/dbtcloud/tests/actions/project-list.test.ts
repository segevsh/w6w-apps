import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-list.ts";

const display = { accessUrl: "https://ab123.us1.dbt.com", accountId: "42" };
const page = (data: unknown[], total = data.length) => ({
  status: 200,
  body: { data, extra: { pagination: { count: data.length, total_count: total } } },
});

/** Projects live in both versions; v3 is the one dbt maintains. */
Deno.test("project-list: reads v3, not v2", async () => {
  const { ctx, calls } = mockCtx([page([{ id: 3, name: "analytics" }])], { display });
  const result = await action.execute!({}, ctx) as { count: number };
  assertEquals(
    calls[0].url.split("?")[0],
    "https://ab123.us1.dbt.com/api/v3/accounts/42/projects/",
  );
  assertEquals(result.count, 1);
});

Deno.test("project-list: the name filter reaches the wire", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ nameContains: "analytics" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("name__icontains"), "analytics");
});

Deno.test("project-list: returnAll pages to the end", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ id: i }));
  const { ctx, calls } = mockCtx([page(full, 101), page([{ id: 100 }], 101)], { display });
  const result = await action.execute!({ returnAll: true }, ctx) as { count: number };
  assertEquals(calls.length, 2);
  assertEquals(result.count, 101);
});
