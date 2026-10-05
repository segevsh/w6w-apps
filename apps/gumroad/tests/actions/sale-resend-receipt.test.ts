import { assertEquals, assertRejects } from "@std/assert";
import saleResendReceipt from "../../actions/sale-resend-receipt.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "saleId": "saleId-1==" };

Deno.test("sale-resend-receipt: sends POST /v2/sales/saleId-1%3D%3D/resend_receipt with the mapped parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  await saleResendReceipt.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/sales/saleId-1%3D%3D/resend_receipt");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("sale-resend-receipt: returns the documented result shape", async () => {
  const { ctx } = mockCtx([{ body: { "success": true } }]);
  assertEquals(await saleResendReceipt.execute(INPUT, ctx), { "success": true });
});

Deno.test("sale-resend-receipt: a 404 surfaces Gumroad's own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { success: false, message: "The thing could not be found." },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(saleResendReceipt.execute(INPUT, ctx)),
    Error,
  );
  assertEquals(err.message.includes("The thing could not be found."), true, err.message);
});

Deno.test("sale-resend-receipt: a 200 carrying success:false is still a failure", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "refused" } }]);
  await assertRejects(
    () => Promise.resolve(saleResendReceipt.execute(INPUT, ctx)),
    Error,
    "refused",
  );
});
