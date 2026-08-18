import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/multi-search.ts";

const conn = { display: { baseUrl: "https://search.example.com" } };

Deno.test("multi-search: POSTs the queries in one request", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }], conn);
  await action.execute!({
    queries: '[{"indexUid":"movies","q":"dune"},{"indexUid":"books","q":"dune"}]',
  }, ctx);
  assertEquals(calls[0].url, "https://search.example.com/multi-search");
  assertEquals(JSON.parse(calls[0].body!).queries.length, 2);
  assertEquals(JSON.parse(calls[0].body!).federation, undefined);
});

Deno.test("multi-search: federation is sent only when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await action.execute!({
    queries: '[{"indexUid":"movies","q":"x"}]',
    federation: '{"limit":20}',
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).federation, { limit: 20 });
});

/** Each query names its own index, so a missing one is caught locally. */
Deno.test("multi-search: a query without an indexUid is refused before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ queries: '[{"q":"dune"}]' }, ctx),
    Error,
    "query 0 has no `indexUid`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("multi-search: an empty or non-array queries value is refused", async () => {
  for (const queries of ["[]", '{"q":"x"}']) {
    const { ctx, calls } = mockCtx([], conn);
    await assertRejects(
      async () => await action.execute!({ queries }, ctx),
      Error,
      "`queries` is required",
    );
    assertEquals(calls.length, 0);
  }
});
