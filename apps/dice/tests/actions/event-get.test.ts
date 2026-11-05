import { test } from "node:test";
import assert from "node:assert/strict";
import action from "../../actions/event-get.ts";
import { mockCtx } from "../_helpers.ts";

test("event-get uses a bound node ID and Event fragment", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { node: { __typename: "Event", id: "e", name: null } } },
  }]);
  assert.deepEqual(await action.execute({ id: 'quoted"id' }, ctx), {
    event: { id: "e", name: null },
  });
  const body = JSON.parse(calls[0].body!);
  assert.deepEqual(body.variables, { id: 'quoted"id' });
  assert.match(body.query, /node\(id: \$id\)/);
  assert.match(body.query, /\.\.\. on Event/);
});
test("event-get rejects wrong type and missing ID", async () => {
  const { ctx } = mockCtx([{ body: { data: { node: { __typename: "Order", id: "o" } } } }]);
  await assert.rejects(() => Promise.resolve(action.execute({ id: "o" }, ctx)), /not found/);
  await assert.rejects(() => Promise.resolve(action.execute({}, ctx)), /id is required/);
});
