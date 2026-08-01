import type { ActionDefinition } from "@w6w/types";
import { compact, OktaClient } from "../lib/client.ts";

interface Input {
  firstName: string;
  lastName: string;
  email: string;
  login?: string;
  activate?: boolean;
}

const userCreate: ActionDefinition<Input> = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create User",
  description: "Create a user profile in the org.",
  // Okta mints a new user id per call; retrying a failed create makes a duplicate.
  idempotent: false,
  params: [
    { key: "firstName", label: "First name", type: "string", required: true, row: "name" },
    { key: "lastName", label: "Last name", type: "string", required: true, row: "name" },
    { key: "email", label: "Email", type: "string", required: true, row: "contact" },
    {
      key: "login",
      label: "Login",
      type: "string",
      row: "contact",
      hint: "Must be unique and an email address. Defaults to Email if left blank.",
    },
    {
      key: "activate",
      label: "Activate",
      type: "boolean",
      default: true,
      hint: "Whether to activate the user and allow access to assigned applications.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "status", type: "string", label: "Status" },
  ],

  execute(input, ctx) {
    return new OktaClient(ctx).request("/users", {
      method: "POST",
      query: { activate: input.activate ?? true },
      body: {
        profile: compact({
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          login: input.login || input.email,
        }),
      },
    });
  },
};

export default userCreate;
