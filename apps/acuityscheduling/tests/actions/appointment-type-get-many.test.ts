import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/appointment-type-get-many.ts";

test("appointment-type-get-many: GETs /appointment-types", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  const result = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/appointment-types");
  assertEquals(result, [{ id: 1 }]);
});

test("appointment-type-get-many: passes includeDeleted through", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({ includeDeleted: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("includeDeleted"), "true");
});
