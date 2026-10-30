import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-delete-table-column.ts";

test("document-delete-table-column: emits deleteTableColumn with tableCellLocation", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { documentURL: "d-1", index: 4, rowIndex: 0, columnIndex: 3 },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    requests: [{
      deleteTableColumn: {
        tableCellLocation: {
          rowIndex: 0,
          columnIndex: 3,
          tableStartLocation: { segmentId: "", index: 4 },
        },
      },
    }],
  });
});
