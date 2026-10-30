import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { BASE_PATH, DISPLAY, mockCtx, paramsOf } from "../_helpers.ts";
import action from "../../actions/form-get-many.ts";

test("form-get-many: GETs /forms", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: DISPLAY });
  await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, `${BASE_PATH}/forms`);
});

test("form-get-many: maps camelCase params onto the documented query names", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: DISPLAY });
  await action.execute(
    { page: 2, pageSize: 10, order: "DESC", orderBy: "name", search: "contact" },
    ctx,
  );
  const params = paramsOf(calls);
  assertEquals(params.get("page"), "2");
  assertEquals(params.get("page_size"), "10");
  assertEquals(params.get("order"), "DESC");
  assertEquals(params.get("order_by"), "name");
  assertEquals(params.get("search"), "contact");
});

test("form-get-many: omits unset filters rather than sending them blank", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: DISPLAY });
  await action.execute({}, ctx);
  assertEquals([...paramsOf(calls).keys()].length, 0);
});
