import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, pathOf, queryOf, TEST_DISPLAY } from "../_helpers.ts";
import action from "../../actions/service-get-many.ts";

test("service-get-many: GETs /admin/services", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Haircut" }] }], {
    display: TEST_DISPLAY,
  });
  const result = await action.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/admin/services");
  assertEquals(result, [{ id: 1, name: "Haircut" }]);
});

test("service-get-many: passes the search filter", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: TEST_DISPLAY });
  await action.execute({ search: "hair" }, ctx);
  assertEquals(queryOf(calls[0].url)["filter[search]"], "hair");
});
