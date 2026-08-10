import { assertEquals } from "@std/assert";
import transactionGet from "../../actions/transaction-get.ts";
import { doc, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("transaction-get: GETs the resource by id", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await transactionGet.execute({ id: "7" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0]), "/v1/transactions/7");
});

Deno.test("transaction-get: forwards the sparse fieldset", async () => {
  const { ctx, calls } = mockCtx([{ body: doc("7") }]);
  await transactionGet.execute({ id: "7", fields: "amount" }, ctx);
  assertEquals(queryOf(calls[0])["fields[transactions]"], "amount");
});

Deno.test("transaction-get: an id with a slash is percent-encoded, not path-injected", async () => {
  const { ctx, calls } = mockCtx([{ body: doc() }]);
  await transactionGet.execute({ id: "a/b" }, ctx);
  assertEquals(pathOf(calls[0]), "/v1/transactions/a%2Fb");
});
