import { assertEquals } from "@std/assert";
import listTransactions from "../../actions/list-transactions.ts";
import { API_ROOT, errorBody, mockCtx, pagination, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-transactions: GET /1.0/commerce/transactions by orderId", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      pagination: pagination(),
      documents: [{ id: "D1", salesOrderId: "O1", total: { currency: "USD", value: 49.99 } }],
    },
  }]);
  const out = await listTransactions.execute!({ orderId: "O1" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1.0/commerce/transactions");
  assertEquals(queryOf(calls[0].url), { orderId: "O1" });
  assertEquals(out.documents?.[0].salesOrderId, "O1");
});

Deno.test("list-transactions: the modified window and cursor pass through", async () => {
  const { ctx, calls } = mockCtx([{ body: { pagination: pagination(), documents: [] } }]);
  await listTransactions.execute!({
    cursor: "CUR1",
    modifiedAfter: "2026-09-01T00:00:00Z",
    modifiedBefore: "2026-09-30T23:59:59Z",
  }, ctx);

  assertEquals(
    calls[0].url,
    `${API_ROOT}/1.0/commerce/transactions?cursor=CUR1` +
      "&modifiedAfter=2026-09-01T00%3A00%3A00Z&modifiedBefore=2026-09-30T23%3A59%3A59Z",
  );
});

Deno.test("list-transactions: the vendor's own misspelled gateway-error values are kept", async () => {
  const { ctx } = mockCtx([{
    body: {
      pagination: pagination(),
      documents: [
        { id: "D1", paymentGatewayError: "GATEWAY_FEE_PROCEESING_ERROR" },
        { id: "D2", paymentGatewayError: "GATEWAY_DISCONNNECTED" },
        { id: "D3", paymentGatewayError: null },
      ],
    },
  }]);
  const out = await listTransactions.execute!({}, ctx);

  assertEquals(out.documents?.map((d) => d.paymentGatewayError), [
    "GATEWAY_FEE_PROCEESING_ERROR",
    "GATEWAY_DISCONNNECTED",
    null,
  ]);
});

Deno.test("list-transactions: a vendor 400 is surfaced with its subtype", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("INVALID_REQUEST_ERROR", {
      subtype: "INVALID_ARGUMENT",
      message: "orderId is invalid",
    }),
  }]);

  let message = "";
  try {
    await listTransactions.execute!({ orderId: "nope" }, ctx);
  } catch (err) {
    message = (err as Error).message;
  }
  assertEquals(message.includes("400 INVALID_REQUEST_ERROR/INVALID_ARGUMENT"), true);
});
