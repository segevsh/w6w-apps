import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId } from "../lib/client.ts";

/** `GET /v1/metrics/{metric}/customers` — The customers behind one metric over a date range. */
interface Input {
  metric: string;
  start_date: string;
  end_date: string;
  per_page?: number;
  page?: number;
}

const metricCustomers: ActionDefinition<Input> = {
  key: "metric-customers",
  type: "search",
  resource: "metric",
  title: "List Metric Customers",
  description: "The customers behind one metric over a date range.",
  params: [
    {
      key: "metric",
      label: "Metric",
      type: "select",
      required: true,
      hint: "Any metric from the vendor's Available Metrics list.",
      options: [
        { value: "active_customers", label: "active_customers" },
        { value: "active_subscriptions", label: "active_subscriptions" },
        { value: "active_trials", label: "active_trials" },
        { value: "arpu", label: "arpu" },
        { value: "arr", label: "arr" },
        { value: "cancellations", label: "cancellations" },
        { value: "churned_customers", label: "churned_customers" },
        { value: "converted_trials", label: "converted_trials" },
        { value: "coupons", label: "coupons" },
        { value: "downgrades", label: "downgrades" },
        { value: "failed_charges", label: "failed_charges" },
        { value: "fees", label: "fees" },
        { value: "ltv", label: "ltv" },
        { value: "mrr", label: "mrr" },
        { value: "mrr_growth_rate", label: "mrr_growth_rate" },
        { value: "net_revenue", label: "net_revenue" },
        { value: "net_revenue_churn", label: "net_revenue_churn" },
        { value: "new_customers", label: "new_customers" },
        { value: "new_subscriptions", label: "new_subscriptions" },
        { value: "new_trials", label: "new_trials" },
        { value: "other_revenue", label: "other_revenue" },
        { value: "plan_quantities", label: "plan_quantities" },
        { value: "quick_ratio", label: "quick_ratio" },
        { value: "reactivations", label: "reactivations" },
        { value: "refunds", label: "refunds" },
        { value: "revenue_churn", label: "revenue_churn" },
        { value: "trial_conversion", label: "trial_conversion" },
        { value: "trial_time_to_cancelation", label: "trial_time_to_cancelation" },
        { value: "trial_time_to_conversion", label: "trial_time_to_conversion" },
        { value: "upgrades", label: "upgrades" },
        { value: "user_churn", label: "user_churn" },
      ],
    },
    {
      key: "start_date",
      label: "Start date",
      type: "string",
      required: true,
      hint: "YYYY-MM-DD.",
      validation: { pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    },
    {
      key: "end_date",
      label: "End date",
      type: "string",
      required: true,
      hint: "YYYY-MM-DD.",
      validation: { pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
    },
    {
      key: "per_page",
      label: "Per page",
      type: "number",
      hint: "Objects per page. Vendor default 30, maximum 200.",
      validation: { integer: true, min: 1, max: 200 },
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "Page number; the vendor's pagination meta starts at 0.",
      validation: { integer: true, min: 0 },
    },
  ],
  output: [
    { key: "customers", type: "array", label: "Customers" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request(
      "GET",
      `/metrics/${encodeId(input.metric)}/customers`,
      {
        query: {
          start_date: input.start_date,
          end_date: input.end_date,
          per_page: input.per_page,
          page: input.page,
        },
      },
    );
  },
};

export default metricCustomers;
