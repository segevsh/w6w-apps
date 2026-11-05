import { test } from "node:test";
import assert from "node:assert/strict";
import action from "../../actions/graphql-query.ts";
import { mockCtx } from "../_helpers.ts";

test("native GraphQL passes document, variables and operation name unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { node: { id: "abc" } } } }]);
  const query = "query One($id: ID!) { node(id: $id) { id } }";
  assert.deepEqual(
    await action.execute({ query, variables: '{"id":"abc"}', operationName: "One" }, ctx),
    { data: { node: { id: "abc" } } },
  );
  assert.deepEqual(JSON.parse(calls[0].body!), {
    query,
    variables: { id: "abc" },
    operationName: "One",
  });
  assert.equal(action.type, "perform");
  assert.equal(action.idempotent, false);
});
test("native query accepts no variables and rejects malformed input", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { viewer: null } } }]);
  await action.execute({ query: "{ viewer { id } }" }, ctx);
  assert.deepEqual(JSON.parse(calls[0].body!).variables, {});
  await assert.rejects(() => Promise.resolve(action.execute({ query: " " }, ctx)), /query/);
  await assert.rejects(
    () => Promise.resolve(action.execute({ query: "{viewer{id}}", variables: [] }, ctx)),
    /variables/,
  );
  assert.equal(calls.length, 1);
});
