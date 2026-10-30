import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-insert-table-column.ts";

test("document-insert-table-column: emits insertTableColumn with insertRight=true default", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!(
    { documentURL: "d-1", index: 5, rowIndex: 1, columnIndex: 2 },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    requests: [{
      insertTableColumn: {
        insertRight: true,
        tableCellLocation: {
          rowIndex: 1,
          columnIndex: 2,
          tableStartLocation: { segmentId: "", index: 5 },
        },
      },
    }],
  });
});
