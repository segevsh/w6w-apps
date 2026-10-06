import { assertEquals, assertRejects } from "@std/assert";
import rowLinkCreate from "../../actions/row-link-create.ts";
import { BASE_PATH, bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const input = {
  tableId: "0000",
  otherTableId: "1111",
  linkId: "7V2M",
  otherRowsIdsMap: { r1: ["x", "y"] },
};

Deno.test("row-link-create: sends POST /links/ with table ids, link id and the rows map", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: 1 } }]);
  const out = await rowLinkCreate.execute(input, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/links/`);
  assertEquals(bodyOf(calls[0]), {
    table_id: "0000",
    other_table_id: "1111",
    link_id: "7V2M",
    other_rows_ids_map: { r1: ["x", "y"] },
  });
  assertEquals(out.success, 1);
});

Deno.test("row-link-create: the rows map may arrive as JSON text", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await rowLinkCreate.execute({ ...input, otherRowsIdsMap: '{"a":["b"]}' }, ctx);
  assertEquals(bodyOf(calls[0]).other_rows_ids_map, { a: ["b"] });
});

Deno.test("row-link-create: an array where the map belongs is refused without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await rowLinkCreate.execute({ ...input, otherRowsIdsMap: ["a"] }, ctx);
    },
    Error,
    "must be a JSON object",
  );
  assertEquals(calls.length, 0);
});

Deno.test("row-link-create: idempotency is declared as false", () => {
  assertEquals(rowLinkCreate.idempotent, false);
});
