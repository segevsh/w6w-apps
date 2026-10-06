import { searchAction } from "../lib/factory.ts";
import { intParam, statusFilter, strParam } from "../lib/params.ts";

/** `GET /v2/public/search/transactions` */
export default searchAction({
  key: "transaction-search",
  segment: "transactions",
  noun: "transaction",
  plural: "Transactions",
  extraParams: [
    intParam("formId", "Form ID"),
    statusFilter(
      "processing, pending offline, declined, canceled, completed, voided, canceled gateway, error",
    ),
    strParam("type", "Type", "charge, refund, voucher, cash, preauth, chargeback"),
    strParam("paymentMethod", "Payment method", "card, check, offline"),
    strParam("displayId", "Transaction display ID"),
    intParam("orderId", "Order ID"),
    strParam("orderDisplayId", "Order display ID"),
    intParam("customerId", "Customer ID"),
    strParam("orderEmail", "Order email"),
    strParam("orderNumber", "Order number"),
    strParam("txReference", "Transaction reference"),
  ],
});
