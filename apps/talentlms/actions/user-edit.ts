import type { ActionDefinition } from "@w6w/types";
import { customFieldPairs, flag, TalentLmsClient } from "../lib/client.ts";

interface Input {
  userId: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  login?: string;
  password?: string;
  bio?: string;
  timezone?: string;
  credits?: number;
  deactivationDate?: string;
  restrictEmail?: boolean;
  customFields?: unknown;
}

const userEdit: ActionDefinition<Input> = {
  key: "user-edit",
  type: "perform",
  resource: "user",
  title: "Edit User",
  description: "Update a user's profile fields.",
  // Converges on the same end state when retried.
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "number", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "login", label: "Username", type: "string" },
    { key: "password", label: "Password", type: "secret" },
    { key: "bio", label: "Bio", type: "text" },
    {
      key: "timezone",
      label: "Time zone",
      type: "string",
      advanced: true,
      hint: "A time-zone name from the API's Appendix B mapping.",
    },
    { key: "credits", label: "Credits", type: "number", advanced: true },
    {
      key: "deactivationDate",
      label: "Deactivation date",
      type: "string",
      advanced: true,
      hint: "DD/MM/YYYY. Only settable on an active user; an empty value clears it.",
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
    return new TalentLmsClient(ctx).post("edituser", {
      user_id: input.userId,
      first_name: input.firstName,
      last_name: input.lastName,
      email: input.email,
      login: input.login,
      password: input.password,
      bio: input.bio,
      timezone: input.timezone,
      credits: input.credits,
      deactivation_date: input.deactivationDate,
      restrict_email: flag(input.restrictEmail, "on", "off"),
      ...customFieldPairs(input.customFields),
    });
  },
};

export default userEdit;
