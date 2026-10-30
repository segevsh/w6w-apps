import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/list-tags.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

test("list-tags: GET /zapier/tags returns the body under data", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "x" }] }]);
  const out = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/zapier/tags");
  assertEquals(calls[0].body, null);
  assertEquals(out, { data: [{ id: 1, name: "x" }] });
});

test("list-tags: a rejected key surfaces Sierra's errorMessage", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("Unauthorized request") }]);
  await assertRejects(
    () => Promise.resolve(action.execute({}, ctx)),
    Error,
    "Unauthorized request",
  );
});
