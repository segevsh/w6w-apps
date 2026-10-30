import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import readReceiptSend from "../../actions/read-receipt-send.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

test("read-receipt-send: POSTs to /api/mark-read", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "OK", number: "+2" } }]);
  await readReceiptSend.execute({ number: "+2", fromNumber: "+1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/mark-read");
  assertEquals(jsonBodyOf(calls[0]), { number: "+2", from_number: "+1" });
});
