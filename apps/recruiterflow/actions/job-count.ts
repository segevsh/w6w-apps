import type { ActionDefinition } from "@w6w/types";
import { asObject, call, compact, flag, type QueryValue } from "../lib/client.ts";

interface Input {
  onlyOpen?: unknown;
  departments?: unknown;
  locations?: unknown;
}

const jobCount: ActionDefinition<Input> = {
  key: "job-count",
  type: "read",
  title: "Count Jobs",
  description: "Count jobs, optionally only open ones or within departments/locations.",
  params: [
    { key: "onlyOpen", label: "Only open jobs", type: "boolean" },
    {
      key: "departments",
      label: "Department IDs",
      type: "string",
      hint: "Comma-separated department ids.",
    },
    {
      key: "locations",
      label: "Location IDs",
      type: "string",
      hint: "Comma-separated location ids.",
    },
  ],
  output: [{ key: "RESULT", type: "string", label: "Result" }, {
    key: "data",
    type: "object",
    label: "Response data",
  }],

  async execute(input, ctx) {
    const query = compact({
      "only_open": flag(input.onlyOpen),
      "departments": input.departments,
      "locations": input.locations,
    }) as Record<string, QueryValue>;
    const res = await call(ctx, "/job/count", { query });
    return asObject(res);
  },
};

export default jobCount;
