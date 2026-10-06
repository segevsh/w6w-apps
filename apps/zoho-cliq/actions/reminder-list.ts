import type { ActionDefinition } from "@w6w/types";
import { compact, ZohoCliqClient } from "../lib/client.ts";
import { limitParam } from "../lib/params.ts";

interface Input {
  category?: string;
  limit?: number;
  nextSetToken?: string;
}

interface Output {
  category?: string;
  reminders: Array<Record<string, unknown>>;
  nextSetToken?: string | number;
}

/**
 * `GET /api/v2/reminders` — scope `ZohoCliq.Reminders.READ` (or `.ALL`).
 * Defaults to the `mine` category and 20 reminders; answers
 * `{ category, list: [...], next_set_token }`.
 */
const reminderList: ActionDefinition<Input, Output> = {
  key: "reminder-list",
  type: "read",
  resource: "reminder",
  title: "List Reminders",
  description: "List reminders in a category (mine, mine-completed, others, others-completed).",
  params: [
    {
      key: "category",
      label: "Category",
      type: "select",
      default: "mine",
      options: [
        { value: "mine", label: "Mine" },
        { value: "mine-completed", label: "Mine (completed)" },
        { value: "others", label: "Assigned to others" },
        { value: "others-completed", label: "Assigned to others (completed)" },
      ],
    },
    limitParam(100),
    {
      key: "nextSetToken",
      label: "Next set token",
      type: "string",
      hint: "The `nextSetToken` from the previous page.",
    },
  ],
  output: [
    { key: "category", type: "string", label: "Category" },
    { key: "reminders", type: "array", label: "Reminders" },
    { key: "nextSetToken", type: "string", label: "Next page token" },
  ],

  async execute(input, ctx) {
    const body = await new ZohoCliqClient(ctx).request<
      { category?: string; list?: Array<Record<string, unknown>>; next_set_token?: string | number }
    >("/reminders", {
      query: compact({
        category: input.category,
        limit: input.limit,
        next_set_token: input.nextSetToken,
      }),
    });
    return {
      category: body?.category,
      reminders: body?.list ?? [],
      nextSetToken: body?.next_set_token,
    };
  },
};

export default reminderList;
