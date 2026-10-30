import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import list from "../../actions/data-table-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("data-table-list: GETs /v2/data-tables and unwraps tables", async () => {
  const { ctx, calls } = mockCtx([{ body: { tables: [{ id: "tbl_1", key: "products" }] } }]);
  const out = await list.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/data-tables");
  assertEquals(out, { tables: [{ id: "tbl_1", key: "products" }] });
});
