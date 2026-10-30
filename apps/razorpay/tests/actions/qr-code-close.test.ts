import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import qrCodeClose from "../../actions/qr-code-close.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("qr-code-close: posts to /payments/qr_codes/{id}/close", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "qr_1", status: "closed" } }]);
  const out = await qrCodeClose.execute({ id: "qr_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/payments/qr_codes/qr_1/close");
  assertEquals(out, { id: "qr_1", status: "closed" });
});
