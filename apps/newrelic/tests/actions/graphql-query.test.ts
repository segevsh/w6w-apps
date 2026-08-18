import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, gqlError, ok } from "./_shared.ts";
import action from "../../actions/graphql-query.ts";

Deno.test("graphql-query: sends the query and variables verbatim", async () => {
  const { ctx, calls } = mockCtx([ok({ actor: { user: { name: "Ada" } } })], { display });
  const result = await action.execute!({
    query: "query($id: Int!) { actor { account(id: $id) { name } } }",
    variables: '{"id":12345}',
  }, ctx) as { data: { actor: { user: { name: string } } } };
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.variables, { id: 12345 });
  assertEquals(result.data.actor.user.name, "Ada");
});

Deno.test("graphql-query: no variables sends an empty object", async () => {
  const { ctx, calls } = mockCtx([ok({})], { display });
  await action.execute!({ query: "{ actor { user { name } } }" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables, {});
});

/** The escape hatch is not a way around the error handling. */
Deno.test("graphql-query: errors inside a 200 still throw", async () => {
  const { ctx } = mockCtx([gqlError("Cannot query field 'nope'")], { display });
  await assertRejects(
    async () => await action.execute!({ query: "{ nope }" }, ctx),
    Error,
    "Cannot query field",
  );
});

Deno.test("graphql-query: malformed variables JSON names the field", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ query: "{ x }", variables: "{oops" }, ctx),
    Error,
    "`variables` is not valid JSON",
  );
});

Deno.test("graphql-query: needs a query", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`query` is required");
  assertEquals(calls.length, 0);
});

/** The query is the caller's; only its shape is logged. */
Deno.test("graphql-query: logs the shape, never the query", async () => {
  const { ctx, logs } = mockCtx([ok({})], { display });
  await action.execute!({ query: "mutation { secretThing }", variables: '{"a":1}' }, ctx);
  assert(!JSON.stringify(logs).includes("secretThing"), JSON.stringify(logs));
  assertEquals(logs[0].data, { isMutation: true, variableCount: 1 });
});

/** A raw mutation's own errors are per-mutation, so the caller must ask. */
Deno.test("graphql-query: says a raw mutation must read its own errors", () => {
  assert(/raw MUTATION should request/.test(action.description!), action.description);
});
