import { test } from "node:test";
import assert from "node:assert/strict";
import action from "../../actions/viewer-get.ts";
import { mockCtx } from "../_helpers.ts";
import { viewer } from "../fixtures.ts";

test("viewer-get returns partner metadata", async () => {
  const { ctx } = mockCtx([{ body: { data: { viewer } } }]);
  assert.deepEqual(await action.execute({}, ctx), viewer);
});
test("viewer-get rejects missing partner", async () => {
  const { ctx } = mockCtx([{ body: { data: { viewer: null } } }]);
  await assert.rejects(() => Promise.resolve(action.execute({}, ctx)), /no partner/);
});
