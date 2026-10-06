import { assertEquals } from "@std/assert";
import formList from "../../actions/form-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("form-list: GET /api/forms with optional page", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { current_page: 2, data: [] } } }, {
    body: { data: { data: [] } },
  }]);
  await formList.execute({ page: 2 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/forms");
  assertEquals(queryOf(calls[0].url), { page: "2" });
  await formList.execute({}, ctx);
  assertEquals(queryOf(calls[1].url), {});
});
