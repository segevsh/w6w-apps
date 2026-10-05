import type { ActionDefinition } from "@w6w/types";
import { compact, MemberstackClient } from "../lib/client.ts";
import { asObject } from "../lib/params.ts";

/**
 * `POST /members`. `password` is required unless the app has passwordless auth enabled.
 * `plans` takes FREE plans only; paid plans need the Stripe checkout flow in the DOM SDK.
 * Email addresses must be unique within the app.
 */
interface Input {
  email: string;
  password?: string;
  planIds?: string[];
  customFields?: unknown;
  metaData?: unknown;
  json?: unknown;
  loginRedirect?: string;
}

const memberCreate: ActionDefinition<Input> = {
  key: "member-create",
  type: "perform",
  resource: "member",
  title: "Create Member",
  description: "Create a member, optionally on free plans and with custom fields.",
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "password",
      label: "Password",
      type: "secret",
      hint: "Required unless passwordless (email/OTP) authentication is enabled.",
    },
    {
      key: "planIds",
      label: "Free plan IDs",
      type: "multiselect",
      hint: "Free plan ids (pln_…) to attach on creation.",
    },
    { key: "customFields", label: "Custom fields", type: "json" },
    { key: "metaData", label: "Metadata", type: "json" },
    { key: "json", label: "Member JSON", type: "json" },
    { key: "loginRedirect", label: "Login redirect", type: "string", placeholder: "/dashboard" },
  ],
  output: [{ key: "member", type: "object", label: "The created member" }],

  async execute(input, ctx) {
    const body = await new MemberstackClient(ctx).json<{ data?: unknown }>("/members", {
      method: "POST",
      body: compact({
        email: input.email,
        password: input.password,
        plans: input.planIds?.length ? input.planIds.map((planId) => ({ planId })) : undefined,
        customFields: asObject(input.customFields, "customFields"),
        metaData: asObject(input.metaData, "metaData"),
        json: asObject(input.json, "json"),
        loginRedirect: input.loginRedirect,
      }),
    });
    return { member: body?.data ?? null };
  },
};

export default memberCreate;
