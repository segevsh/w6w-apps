import { assertEquals, assertRejects } from "@std/assert";
import rowLinkList from "../../actions/row-link-list.ts";
import { BASE_PATH, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("row-link-list: POSTs /query-links/ with one entry per row", async () => {
  const links = { r1: [{ row_id: "x", display_value: "Orson" }] };
  const { ctx, calls } = mockCtx([{ body: links }]);
  const out = await rowLinkList.execute(
    { tableName: "T", linkColumnName: "Link", rowIds: ["r1", "r2"] },
    ctx,
  ) as { links: unknown };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/query-links/`);
  assertEquals(bodyOf(calls[0]), {
    table_name: "T",
    link_column_name: "Link",
    rows: [{ row_id: "r1" }, { row_id: "r2" }],
  });
  assertEquals(out.links, links);
});

Deno.test("row-link-list: offset and limit apply to every row", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await rowLinkList.execute(
    { tableName: "T", linkColumnName: "L", rowIds: '["r1"]', offset: 0, limit: 50 },
    ctx,
  );
  assertEquals(bodyOf(calls[0]).rows, [{ row_id: "r1", offset: 0, limit: 50 }]);
});

Deno.test("row-link-list: an empty row list is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await rowLinkList.execute({ tableName: "T", linkColumnName: "L", rowIds: [] }, ctx);
    },
    Error,
    "must not be empty",
  );
  assertEquals(calls.length, 0);
});
