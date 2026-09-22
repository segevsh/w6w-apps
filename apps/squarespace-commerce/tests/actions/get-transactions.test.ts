import { assertEquals, assertThrows } from "@std/assert";
import getTransactions from "../../actions/get-transactions.ts";
import { API_ROOT, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-transactions: GET /1.0/commerce/transactions/{documentIds}", async () => {
  const { ctx, calls } = mockCtx([{ body: { documents: [{ id: "D1" }, { id: "D2" }] } }]);
  const out = await getTransactions.execute!({ documentIds: "D1,D2" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1.0/commerce/transactions/D1,D2");
  assertEquals(out.documents?.length, 2);
});

Deno.test("get-transactions: the requirement headers go out on every call", async () => {
  const { ctx, calls } = mockCtx([{ body: { documents: [] } }]);
  await getTransactions.execute!({ documentIds: "D1" }, ctx);

  assertEquals(calls[0].url.startsWith(API_ROOT), true);
  assertEquals(calls[0].headers["user-agent"], "w6w-squarespace-commerce/1.0");
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("get-transactions: more than 50 document ids is refused before the request", () => {
  const { ctx } = mockCtx([]);
  const ids = Array.from({ length: 51 }, (_, i) => `D${i}`).join(",");
  assertThrows(() => getTransactions.execute!({ documentIds: ids }, ctx), Error, "at most 50");
});

Deno.test("get-transactions: a 404 is surfaced with its subtype and the path", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("INVALID_REQUEST_ERROR", {
      subtype: "MISSING_ARGUMENT",
      message: "Document not found",
    }),
  }]);

  let message = "";
  try {
    await getTransactions.execute!({ documentIds: "D9" }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("404 INVALID_REQUEST_ERROR/MISSING_ARGUMENT"), true);
  assertEquals(message.includes("/1.0/commerce/transactions/D9"), true);
  assertEquals(message.includes("Document not found"), true);
});
