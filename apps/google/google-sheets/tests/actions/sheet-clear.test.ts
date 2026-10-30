import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/sheet-clear.ts";

test("sheet-clear: POSTs values.clear with empty body", async () => {
  const { ctx, calls } = mockCtx([{ body: { clearedRange: "Sheet1!A2:D" } }]);
  await action.execute({ spreadsheetId: "ss-1", range: "Sheet1!A2:D" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v4/spreadsheets/ss-1/values/Sheet1!A2%3AD:clear");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, "{}");
});
