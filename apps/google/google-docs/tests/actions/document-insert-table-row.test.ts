import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-insert-table-row.ts";

test("document-insert-table-row: emits insertTableRow with insertBelow=true default", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { documentURL: "d-1", index: 10, rowIndex: 0, columnIndex: 0 },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    requests: [{
      insertTableRow: {
        insertBelow: true,
        tableCellLocation: {
          rowIndex: 0,
          columnIndex: 0,
          tableStartLocation: { segmentId: "", index: 10 },
        },
      },
    }],
  });
});
