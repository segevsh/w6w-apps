import { assertEquals } from "@std/assert";
import dealDelete from "../../actions/deal-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("deal-delete: DELETE /v1/deals/{dealId}/", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await dealDelete.execute({ dealId: "5" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/deals/5/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(result, { deleted: true, id: "5" });
});

Deno.test("deal-delete: declares type perform", () => {
  assertEquals(dealDelete.type, "perform");
  assertEquals(dealDelete.idempotent, true);
});

Deno.test("deal-delete: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await dealDelete.execute({ dealId: "5" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
