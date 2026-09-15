import { assertEquals } from "@std/assert";
import { connected, mockCtx } from "../_helpers.ts";
import action from "../../actions/get-transaction.ts";

Deno.test("get-transaction: is a read action requiring transactionId", () => {
  assertEquals(action.key, "get-transaction");
  assertEquals(action.type, "read");
  const p = (action.params ?? []).find((p) => p.key === "transactionId")!;
  assertEquals(p.required, true);
});

Deno.test("get-transaction: GETs /transactions/{id}, accepting a `uuid-` prefixed lookup", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "t1" } }]);
  await action.execute({ transactionId: "uuid-abc" }, connected(ctx));
  assertEquals(new URL(calls[0].url).pathname, "/transactions/uuid-abc");
});
