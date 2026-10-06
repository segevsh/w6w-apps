import type { ActionDefinition } from "@w6w/types";
import { BaremetricsClient, encodeId } from "../lib/client.ts";

/** `POST /v1/{source_id}/plans` — Create a plan in the Baremetrics API source. */
interface Input {
  source_id: string;
  oid: string;
  name: string;
  currency: string;
  amount: number;
  interval: string;
  interval_count: number;
  trial_duration?: number;
  trial_duration_unit?: string;
}

const planCreate: ActionDefinition<Input> = {
  key: "plan-create",
  type: "perform",
  resource: "plan",
  title: "Create Plan",
  description: "Create a plan in the Baremetrics API source.",
  idempotent: false,
  params: [
    {
      key: "source_id",
      label: "Source ID",
      type: "string",
      required: true,
      hint:
        "Id from List Sources. You can read data from any source, but only modify data that was added through the API (the Baremetrics source).",
    },
    { key: "oid", label: "Plan OID", type: "string", required: true },
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      hint: "Shown in the Plan Breakout section.",
    },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      required: true,
      hint: "ISO code, e.g. usd.",
    },
    {
      key: "amount",
      label: "Amount (cents)",
      type: "number",
      required: true,
      validation: { integer: true, min: 0 },
    },
    {
      key: "interval",
      label: "Interval",
      type: "select",
      required: true,
      options: [{ value: "day", label: "Day" }, { value: "month", label: "Month" }, {
        value: "year",
        label: "Year",
      }],
    },
    {
      key: "interval_count",
      label: "Interval count",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "trial_duration",
      label: "Trial duration",
      type: "number",
      hint: "Used with trial duration unit. Vendor default 0.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "trial_duration_unit",
      label: "Trial duration unit",
      type: "string",
      hint: "Vendor default day.",
    },
  ],
  output: [
    { key: "plan", type: "object", label: "The created plan" },
  ],

  execute(input, ctx) {
    return new BaremetricsClient(ctx).request("POST", `/${encodeId(input.source_id)}/plans`, {
      body: {
        oid: input.oid,
        name: input.name,
        currency: input.currency,
        amount: input.amount,
        interval: input.interval,
        interval_count: input.interval_count,
        trial_duration: input.trial_duration,
        trial_duration_unit: input.trial_duration_unit,
      },
    });
  },
};

export default planCreate;
