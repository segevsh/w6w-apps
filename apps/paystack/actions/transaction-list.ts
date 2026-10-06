import { dateRangeParams, listAction, paginationParams } from "../lib/factory.ts";

/** `GET /transaction`. */
export default listAction({
  key: "transaction-list",
  title: "List Transactions",
  description: "List transactions, newest first, optionally filtered.",
  resource: "transaction",
  path: "/transaction",
  query: {
    status: "status",
    channel: "channel",
    customerCode: "customer_code",
    source: "source",
    amount: "amount",
    settlement: "settlement",
    subaccountCode: "subaccount_code",
    splitCode: "split_code",
  },
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["success", "failed", "abandoned", "reversed"].map((v) => ({ value: v, label: v })),
    },
    {
      key: "channel",
      label: "Channel",
      type: "select",
      options: ["card", "pos", "bank", "dedicated_nuban", "ussd", "bank_transfer"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    {
      key: "customerCode",
      label: "Customer code",
      type: "string",
      hint: "e.g. CUS_c6wqvwmvwopw4ms.",
    },
    {
      key: "source",
      label: "Source",
      type: "select",
      options: ["merchantApi", "checkout", "pos", "virtualTerminal"].map((v) => ({
        value: v,
        label: v,
      })),
    },
    {
      key: "amount",
      label: "Amount (smallest unit)",
      type: "number",
      validation: { integer: true },
    },
    { key: "settlement", label: "Settlement id", type: "number", validation: { integer: true } },
    { key: "subaccountCode", label: "Subaccount code", type: "string" },
    { key: "splitCode", label: "Split code", type: "string" },
    ...dateRangeParams,
    ...paginationParams,
  ],
});
