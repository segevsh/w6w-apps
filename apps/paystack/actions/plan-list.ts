import { dateRangeParams, listAction, paginationParams } from "../lib/factory.ts";

/** `GET /plan`. */
export default listAction({
  key: "plan-list",
  title: "List Plans",
  description: "List subscription plans.",
  resource: "plan",
  path: "/plan",
  query: { interval: "interval", amount: "amount" },
  params: [
    {
      key: "interval",
      label: "Interval",
      type: "select",
      options: ["daily", "weekly", "monthly", "biannually", "annually"].map((v) => ({
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
    ...dateRangeParams,
    ...paginationParams,
  ],
});
