import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import qrCodeGet from "../../actions/qr-code-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("qr-code-get: fetches /payments/qr_codes/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "qr_1", status: "active" } }]);
  const out = await qrCodeGet.execute({ id: "qr_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/payments/qr_codes/qr_1");
  assertEquals(out, { id: "qr_1", status: "active" });
});
