import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/quote-list.ts";

Deno.test("quote-list: filters by client and status, sort wrapped in a list", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { quotes: { nodes: [] } } } }]);
  await action.execute(
    { clientId: "c1", status: "awaiting_response", sortKey: "QUOTE_TOTAL" },
    ctx,
  );
  const vars = JSON.parse(calls[0].body!).variables;
  assertEquals(vars.filter, { clientId: "c1", status: "awaiting_response" });
  assertEquals(vars.sort, [{ key: "QUOTE_TOTAL", direction: "DESCENDING" }]);
});

Deno.test("quote-list: statuses are Jobber's lower-case enum values", () => {
  const status = action.params?.find((p) => p.key === "status");
  const values = (status?.options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(values.every((v) => v === v.toLowerCase()), true);
  assert(values.includes("awaiting_response"));
});
