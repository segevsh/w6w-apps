import { assertEquals } from "@std/assert";
import { mockMocoCtx } from "../_helpers.ts";
import action from "../../actions/company-list.ts";

Deno.test("company-list: GETs /companies with a type filter", async () => {
  const { ctx, calls } = mockMocoCtx([{
    body: [{ id: 1, type: "customer", name: "Beispiel AG" }],
    headers: {
      "content-type": "application/json",
      "x-page": "1",
      "x-per-page": "100",
      "x-total": "1",
    },
  }]);
  const out = await action.execute({ type: "customer" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/companies");
  assertEquals(url.searchParams.get("type"), "customer");
  assertEquals(out, {
    companies: [{ id: 1, type: "customer", name: "Beispiel AG" }],
    page: 1,
    perPage: 100,
    total: 1,
  });
});

Deno.test("company-list: an empty type filter is omitted, not sent as ''", async () => {
  const { ctx, calls } = mockMocoCtx([{ body: [] }]);
  await action.execute({ type: "" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("type"), false);
});
