import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/autocomplete-company.ts";

Deno.test("autocomplete-company: does not require a Connection", () => {
  assertEquals(action.requiresAuth, false);
});

Deno.test("autocomplete-company: GETs autocomplete.clearbit.com/v1/companies/suggest?query=...", async () => {
  const { ctx, calls } = mockCtx([{
    body: [{ name: "Segment", domain: "segment.com", logo: null }],
  }]);
  const result = await action.execute!({ query: "segment" }, ctx);
  assertEquals(
    calls[0].url,
    "https://autocomplete.clearbit.com/v1/companies/suggest?query=segment",
  );
  assertEquals(result, { results: [{ name: "Segment", domain: "segment.com", logo: null }] });
});

Deno.test("autocomplete-company: never sends an Authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute!({ query: "segment" }, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("autocomplete-company: requires query", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ query: "" }, ctx), Error, "query");
  assertEquals(calls.length, 0);
});
