import type { ActionDefinition } from "@w6w/types";
import { compact, csv, HyrosClient } from "../lib/client.ts";

interface Input {
  name?: string;
  startDate: string;
  endDate?: string;
  frequency: string;
  cost: number;
  tags: string;
}

const customCostCreate: ActionDefinition<Input> = {
  key: "custom-cost-create",
  type: "perform",
  resource: "cost",
  title: "Create Custom Cost",
  description: "Assign a manual cost (agency fee, offline spend) to one or more source tags.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", hint: 'e.g. "Monthly Agency Fee".' },
    { key: "startDate", label: "Start date", type: "string", required: true, hint: "ISO 8601." },
    { key: "endDate", label: "End date", type: "string", hint: "ISO 8601." },
    {
      key: "frequency",
      label: "Frequency",
      type: "select",
      required: true,
      options: [{ value: "DAILY", label: "Daily" }, { value: "ONE_TIME", label: "One time" }],
    },
    {
      key: "cost",
      label: "Cost",
      type: "number",
      required: true,
      hint: "Greater than zero, in the account currency.",
    },
    {
      key: "tags",
      label: "Source tags",
      type: "string",
      required: true,
      hint: "Comma-separated source tags such as @facebook, at most 10.",
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Hyros request id" },
    { key: "result", type: "string", label: '"OK" on success' },
  ],

  execute(input, ctx) {
    const tags = csv(input.tags);
    if (tags.length === 0 || tags.length > 10) {
      throw new Error("Give between 1 and 10 source tags.");
    }
    return new HyrosClient(ctx).write("POST", "/custom-costs", {
      body: compact({
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        frequency: input.frequency,
        cost: input.cost,
        tags,
      }),
    });
  },
};

export default customCostCreate;
