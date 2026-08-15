import type { ActionDefinition } from "@w6w/types";
import { queryFilters, ThinkificClient } from "../lib/client.ts";
import { type PaginationInput, paginationParams, paginationQuery } from "../lib/params.ts";

interface Input extends PaginationInput {
  email?: string;
  role?: string;
  externalSource?: string;
  customProfileFieldLabel?: string;
  customProfileFieldValue?: string;
  groupId?: number;
}

const usersList: ActionDefinition<Input> = {
  key: "users-list",
  type: "read",
  resource: "users",
  title: "List Users",
  description: "Retrieve a paginated, filterable list of Users on this Site.",
  params: [
    ...paginationParams(),
    { key: "email", label: "Email", type: "string", hint: "Search Users by email." },
    { key: "role", label: "Role", type: "string", hint: "Search Users by role." },
    {
      key: "externalSource",
      label: "External source",
      type: "string",
      hint: "Search Users by external source.",
    },
    {
      key: "customProfileFieldLabel",
      label: "Custom profile field label",
      type: "string",
      hint: "Must be combined with Custom profile field value.",
    },
    {
      key: "customProfileFieldValue",
      label: "Custom profile field value",
      type: "string",
      hint: "Must be combined with Custom profile field label.",
    },
    { key: "groupId", label: "Group ID", type: "number", hint: "Search by group id." },
  ],
  output: [
    { key: "items", type: "array", label: "Users" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    const query = {
      ...paginationQuery(input),
      ...queryFilters({
        email: input.email,
        role: input.role,
        external_source: input.externalSource,
        custom_profile_field_label: input.customProfileFieldLabel,
        custom_profile_field_value: input.customProfileFieldValue,
        group_id: input.groupId,
      }),
    };
    return await new ThinkificClient(ctx).list("/users", { query });
  },
};

export default usersList;
