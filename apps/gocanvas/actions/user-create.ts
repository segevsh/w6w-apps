import type { ActionDefinition } from "@w6w/types";
import { compact, GoCanvasClient } from "../lib/client.ts";
import { departmentIdParam, roleParam } from "../lib/params.ts";

interface Input {
  email: string;
  firstName: string;
  lastName: string;
  departmentRole: string;
  departmentId?: number;
  accountRole?: string;
  password?: string;
  phone?: string;
  skipWelcomeEmail?: boolean;
}

const userCreate: ActionDefinition<Input> = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create User",
  description:
    "Create a user. Needs an email, first and last name and a department role; when Departments are enabled a department id is required too. Without a password GoCanvas emails a set-your-password link.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string", required: true },
    { key: "lastName", label: "Last name", type: "string", required: true },
    roleParam(true),
    departmentIdParam,
    {
      key: "accountRole",
      label: "Account role",
      type: "select",
      options: [{ value: "account_admin", label: "account_admin" }, {
        value: "account_reporter",
        label: "account_reporter",
      }],
      hint: "Only used when Departments are enabled.",
    },
    {
      key: "password",
      label: "Password",
      type: "secret",
      hint:
        "Must satisfy the company password policy. Leave empty to have GoCanvas generate one and email a set-password link.",
    },
    { key: "phone", label: "Phone", type: "string" },
    { key: "skipWelcomeEmail", label: "Skip welcome email", type: "boolean" },
  ],
  output: [
    { key: "data", type: "object", label: "The created user" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request("/users", {
      method: "POST",
      body: compact({
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        department_role: input.departmentRole,
        department_id: input.departmentId,
        account_role: input.accountRole,
        password: input.password,
        phone: input.phone,
        skip_welcome_email: input.skipWelcomeEmail,
      }),
    });
  },
};

export default userCreate;
