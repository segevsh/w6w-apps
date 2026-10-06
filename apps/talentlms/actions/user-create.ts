import type { ActionDefinition } from "@w6w/types";
import { customFieldPairs, flag, TalentLmsClient } from "../lib/client.ts";

interface Input {
  firstName: string;
  lastName: string;
  email: string;
  login: string;
  password: string;
  userType?: string;
  language?: string;
  branchId?: number;
  groupId?: number;
  restrictEmail?: boolean;
  customFields?: unknown;
}

const userCreate: ActionDefinition<Input> = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create User",
  description: "Sign up a new user in the domain.",
  // Mints something new on every call, so a retry is not safe.
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    { key: "login", label: "Username", type: "string", required: true },
    { key: "password", label: "Password", type: "secret", required: true },
    {
      key: "userType",
      label: "User type",
      type: "string",
      advanced: true,
      hint: "Name of a user type, e.g. Learner-Type.",
    },
    { key: "language", label: "Language", type: "string", advanced: true, hint: "Language code." },
    { key: "branchId", label: "Branch ID", type: "number", advanced: true },
    {
      key: "groupId",
      label: "Group ID",
      type: "number",
      advanced: true,
      hint: "Joining a group also enrolls the user in the group's courses.",
    },
    { key: "restrictEmail", label: "Exclude from emails", type: "boolean", advanced: true },
    {
      key: "customFields",
      label: "Custom fields",
      type: "json",
      advanced: true,
      hint:
        'Object keyed by field index or key, e.g. {"1": "Sales", "custom_field_2": "on"}. Checkbox fields take "on" or "off".',
    },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).post("usersignup", {
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      login: input.login,
      password: input.password,
      user_type: input.userType,
      language: input.language,
      branch_id: input.branchId,
      group_id: input.groupId,
      restrict_email: flag(input.restrictEmail, "on", "off"),
      ...customFieldPairs(input.customFields),
    });
  },
};

export default userCreate;
