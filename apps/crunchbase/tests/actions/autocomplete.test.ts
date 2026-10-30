import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/autocomplete.ts";

test("autocomplete: GETs the query against the base host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { entities: [] } }]);
  await action.execute!({ query: "airbnb" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.crunchbase.com/v4/data/autocompletes?query=airbnb",
  );
});

test("autocomplete: collectionIds and limit pass through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { entities: [] } }]);
  await action.execute!(
    { query: "box", collectionIds: "organization.companies", limit: 5 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("collection_ids"), "organization.companies");
  assertEquals(url.searchParams.get("limit"), "5");
});

test("autocomplete: a blank query is rejected before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ query: "  " }, ctx), Error, "`query`");
  assertEquals(calls.length, 0);
});

test("autocomplete: returns the entities array verbatim", async () => {
  const entities = [{ identifier: { uuid: "u1", entity_def_id: "organization" } }];
  const { ctx } = mockCtx([{ status: 200, body: { entities } }]);
  const result = await action.execute!({ query: "x" }, ctx) as { entities: unknown[] };
  assert(Array.isArray(result.entities));
  assertEquals(result.entities, entities);
});
