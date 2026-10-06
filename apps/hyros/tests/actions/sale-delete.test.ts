import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, OK, pathOf } from "../_helpers.ts";
import saleDelete from "../../actions/sale-delete.ts";

Deno.test("sale-delete: DELETE /sales/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const out = await saleDelete.execute({ saleId: "sle-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/api/v1.0/sales/sle-1");
  assertEquals(out, { requestId: "req1", result: "OK" });
});

Deno.test("sale-delete: a text/plain 401 becomes a readable error", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Unauthorized", contentType: "text/plain" }]);
  await assertRejects(
    async () => await saleDelete.execute({ saleId: "s" }, ctx),
    Error,
    "Unauthorized",
  );
});
