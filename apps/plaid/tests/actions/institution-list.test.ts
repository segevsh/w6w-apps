import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/institution-list.ts";

const conn = { display: { environment: "sandbox" } };

Deno.test("institution-list: a query uses the search endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { institutions: [] } }], conn);
  await action.execute!({ query: "platypus", countryCodes: "US" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/institutions/search");
  assertEquals(JSON.parse(calls[0].body!).query, "platypus");
});

Deno.test("institution-list: no query lists them, paged", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { institutions: [], total: 0 } }], conn);
  await action.execute!({ count: 10, offset: 20 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/institutions/get");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.count, 10);
  assertEquals(sent.offset, 20);
});

Deno.test("institution-list: the count is capped at Plaid's maximum", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({ count: 9999 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).count, 500);
});
