import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  by?: string;
  value: string;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description:
    "Fetch one user by ID, email address or username, with their courses, branches, groups, certifications and badges.",
  params: [
    {
      key: "by",
      label: "Look up by",
      type: "select",
      default: "id",
      options: [{ value: "id", label: "User ID" }, { value: "email", label: "Email address" }, {
        value: "username",
        label: "Username",
      }],
    },
    {
      key: "value",
      label: "Value",
      type: "string",
      required: true,
      hint: "The user ID, email address or username, matching the choice above.",
    },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("users", { [input.by ?? "id"]: input.value });
  },
};

export default userGet;
