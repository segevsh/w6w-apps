import type { ActionDefinition } from "@w6w/types";
import { ClerkClient, compact, json } from "../lib/client.ts";

/**
 * `POST /users` — created identifiers are **verified by default**.
 *
 * Setting `emailVerified`/`phoneVerified` to false does not create an *unverified* address in the
 * ordinary sense — Clerk's own spec calls the alternative "reserved": unverified, but already
 * usable for sign-in and locked so no other user can claim it. There is no third option that
 * creates a plain, claimable, unverified identifier through this endpoint.
 */
const action: ActionDefinition = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create user",
  description: "Create a new user with an email address and/or phone number.",
  idempotent: false,
  params: [
    { key: "emailAddress", label: "Email address", type: "string", default: "" },
    { key: "phoneNumber", label: "Phone number", type: "string", default: "" },
    { key: "username", label: "Username", type: "string", default: "" },
    { key: "firstName", label: "First name", type: "string", default: "" },
    { key: "lastName", label: "Last name", type: "string", default: "" },
    {
      key: "password",
      label: "Password",
      type: "secret",
      default: "",
      advanced: true,
      hint: "Plaintext. At least 8 characters. Leave empty for a passwordless user (if the " +
        "instance allows it).",
    },
    {
      key: "emailVerified",
      label: "Create email as verified",
      type: "boolean",
      default: true,
      advanced: true,
      hint: "False creates the address `reserved` instead: unverified, but still usable for " +
        "sign-in and locked to this user — there is no plain unverified option.",
    },
    {
      key: "skipPasswordChecks",
      label: "Skip password policy checks",
      type: "boolean",
      default: false,
      advanced: true,
    },
    {
      key: "publicMetadata",
      label: "Public metadata",
      type: "json",
      default: "",
      advanced: true,
      hint: "Visible to both the Frontend and Backend API.",
    },
    {
      key: "privateMetadata",
      label: "Private metadata",
      type: "json",
      default: "",
      advanced: true,
      hint: "Visible only to the Backend API.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email_addresses", type: "array", label: "Email addresses" },
    { key: "created_at", type: "number", label: "Created at (unix ms)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const email = String(p.emailAddress ?? "").trim();
    const phone = String(p.phoneNumber ?? "").trim();
    if (!email && !phone) {
      throw new Error("provide at least an `emailAddress` or a `phoneNumber`");
    }

    ctx.log("info", "creating a Clerk user", { hasEmail: !!email, hasPhone: !!phone });
    return await new ClerkClient(ctx).request("/users", {
      method: "POST",
      body: compact({
        email_address: email ? [email] : undefined,
        email_address_identification_status: email
          ? [p.emailVerified === false ? "reserved" : "verified"]
          : undefined,
        phone_number: phone ? [phone] : undefined,
        username: p.username,
        first_name: p.firstName,
        last_name: p.lastName,
        password: p.password,
        skip_password_checks: p.skipPasswordChecks === true ? true : undefined,
        public_metadata: json(p.publicMetadata, "publicMetadata"),
        private_metadata: json(p.privateMetadata, "privateMetadata"),
      }),
    });
  },
};
export default action;
