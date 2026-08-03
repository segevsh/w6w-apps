import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/graphql-query.ts";

Deno.test("graphql-query: forwards the document verbatim and parses variables", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { clients: { nodes: [] } } } }]);
  await action.execute({
    query: "query Q($first: Int) { clients(first: $first) { nodes { id } } }",
    variables: '{"first": 5}',
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.query, "query Q($first: Int) { clients(first: $first) { nodes { id } } }");
  assertEquals(sent.variables, { first: 5 });
});

Deno.test("graphql-query: is still pinned to the app's API version", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute({ query: "{ account { id } }" }, ctx);
  assertEquals(calls[0].headers["x-jobber-graphql-version"], "2025-04-16");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("graphql-query: returns extensions alongside data so the cost meter survives", async () => {
  const { ctx } = mockCtx([{
    body: {
      data: { account: { id: "a1" } },
      extensions: { cost: { actualQueryCost: 2, throttleStatus: { currentlyAvailable: 9998 } } },
    },
  }]);
  const out = await action.execute({ query: "{ account { id } }" }, ctx) as {
    data: unknown;
    extensions: { cost: { actualQueryCost: number } };
  };
  assertEquals(out.data, { account: { id: "a1" } });
  assertEquals(out.extensions.cost.actualQueryCost, 2);
});

Deno.test("graphql-query: an HTTP 200 with errors[] still rejects", async () => {
  const { ctx } = mockCtx([{
    body: { errors: [{ message: "Field 'nope' doesn't exist" }], data: null },
  }]);
  await assertRejects(
    async () => await action.execute({ query: "{ nope }" }, ctx),
    Error,
    "doesn't exist",
  );
});

Deno.test("graphql-query: malformed variables fail locally, before any call", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ query: "{ x }", variables: "not json" }, ctx),
    Error,
    "variables must be a JSON object",
  );
  assertEquals(calls.length, 0);
});
