import type { ActionDefinition } from "@w6w/types";
import { customFieldPairs, TalentLmsClient } from "../lib/client.ts";

interface Input {
  name: string;
  description?: string;
  code?: string;
  price?: string;
  timeLimit?: number;
  startDatetime?: string;
  expirationDatetime?: string;
  categoryId?: number;
  creatorId?: number;
  customFields?: unknown;
}

const courseCreate: ActionDefinition<Input> = {
  key: "course-create",
  type: "perform",
  resource: "course",
  title: "Create Course",
  description: "Create a course.",
  // Mints something new on every call, so a retry is not safe.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    { key: "code", label: "Code", type: "string" },
    { key: "price", label: "Price", type: "string" },
    { key: "timeLimit", label: "Time limit", type: "number", advanced: true },
    {
      key: "startDatetime",
      label: "Start",
      type: "string",
      advanced: true,
      hint: "Date and time the course becomes available.",
    },
    { key: "expirationDatetime", label: "Expiration", type: "string", advanced: true },
    { key: "categoryId", label: "Category ID", type: "number" },
    {
      key: "creatorId",
      label: "Creator user ID",
      type: "number",
      advanced: true,
      hint: "Defaults to the account's super-administrator.",
    },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint:
        'Object keyed by custom course field id, e.g. {"1": "social"}. Checkbox fields take "on" or "off".',
    },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).post("createcourse", {
      name: input.name,
      description: input.description,
      code: input.code,
      price: input.price,
      time_limit: input.timeLimit,
      start_datetime: input.startDatetime,
      expiration_datetime: input.expirationDatetime,
      category_id: input.categoryId,
      creator_id: input.creatorId,
      ...customFieldPairs(input.customFields),
    });
  },
};

export default courseCreate;
