import { assertEquals } from "@std/assert";
import transactionDelete from "../../actions/transaction-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("transaction-delete: sends every input as query", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await transactionDelete.execute({ "id": 7 } as never, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/transactions");
  assertEquals(queryOf(calls[0].url), { "id": "7" });
  assertEquals(out, REPLY);
});

Deno.test("transaction-delete: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await transactionDelete.execute({ "id": 7 } as never, ctx);

  assertEquals(queryOf(calls[0].url), { "id": "7" });
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("transaction-delete: declares a perform action's idempotency", () => {
  assertEquals(transactionDelete.type, "perform");
  assertEquals(transactionDelete.idempotent, true);
  assertEquals(transactionDelete.params!.filter((p) => p.required).map((p) => p.key), ["id"]);
});
