import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  pageSize?: number;
  pageNumber?: number;
}

const userGetMany: ActionDefinition<Input> = {
  key: "user-get-many",
  type: "read",
  resource: "user",
  title: "Get Many Users",
  description: "List users, optionally one page at a time.",
  params: [
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      hint: "Omit to return every user in one response.",
    },
    {
      key: "pageNumber",
      label: "Page number",
      type: "number",
      hint: "Defaults to 1 on TalentLMS's side.",
    },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("users", {
      page_size: input.pageSize,
      page_number: input.pageNumber,
    });
  },
};

export default userGetMany;
