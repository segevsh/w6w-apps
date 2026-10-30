import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/audience-segment-list.ts";

test("audience-segment-list: reads the cursor-paged collection", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [{ id: "a" }], pagination: { nextCursor: null } },
  }]);
  assertEquals(await action.execute!({}, ctx), [{ id: "a" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/audience-segments");
});

/** nextCursor is null rather than absent on the last page. */
test("audience-segment-list: returnAll follows the cursor and stops on null", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: "a" }], pagination: { nextCursor: "c2" } } },
    { status: 200, body: { data: [{ id: "b" }], pagination: { nextCursor: null } } },
  ]);
  assertEquals((await action.execute!({ returnAll: true }, ctx) as unknown[]).length, 2);
  assertEquals(new URL(calls[1].url).searchParams.get("cursor"), "c2");
});
