import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sheet-delete.ts";

test("sheet-delete: batchUpdate/deleteSheet by numeric sheetId", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ spreadsheetId: "ss-1", sheetId: 42 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/spreadsheets/ss-1:batchUpdate");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.requests[0].deleteSheet.sheetId, 42);
});
