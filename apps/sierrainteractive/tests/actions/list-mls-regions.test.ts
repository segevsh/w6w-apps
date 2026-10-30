import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/list-mls-regions.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

test("list-mls-regions: GET /zapier/mlsRegion returns the body under data", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "x" }] }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/zapier/mlsRegion");
  assertEquals(calls[0].body, null);
  assertEquals(out, { data: [{ id: 1, name: "x" }] });
});

test("list-mls-regions: a rejected key surfaces Sierra's errorMessage", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("Unauthorized request") }]);
  await assertRejects(
    () => Promise.resolve(action.execute({}, ctx)),
    Error,
    "Unauthorized request",
  );
});
