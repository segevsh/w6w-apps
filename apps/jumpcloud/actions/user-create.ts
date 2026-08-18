import type { ActionDefinition } from "@w6w/types";
import { compact, json, JumpCloudClient } from "../lib/client.ts";

/**
 * `POST /api/systemusers` (V1) — verified against JumpCloud's V1 OpenAPI
 * document (`systemusers_post`; required `email` and `username`).
 *
 * **`state` is the field that decides whether this person can log in.** The
 * three values are not decoration:
 *
 *   - `STAGED` — created, not yet able to authenticate, no activation email.
 *     This is the right value for pre-hire provisioning, and it is this
 *     action's default because creating a live account for someone who starts
 *     next month is the mistake worth defaulting away from.
 *   - `ACTIVATED` — live. Sends the activation email unless a password is set.
 *   - `SUSPENDED` — exists, cannot authenticate.
 *
 * Setting `password` at creation skips the activation email entirely, which is
 * how you hand credentials over out of band.
 */
const action: ActionDefinition = {
  key: "user-create",
  type: "perform",
  resource: "user",
  title: "Create a user",
  description: "Create a directory user, staged by default.",
  // JumpCloud rejects a duplicate username or email rather than deduping.
  idempotent: false,
  params: [
    { key: "username", label: "Username", type: "string", required: true, default: "" },
    { key: "email", label: "Email", type: "string", required: true, default: "" },
    { key: "firstname", label: "First Name", type: "string", default: "" },
    { key: "lastname", label: "Last Name", type: "string", default: "" },
    {
      key: "state",
      label: "State",
      type: "select",
      default: "STAGED",
      options: [
        { value: "STAGED", label: "Staged — cannot log in yet, no email sent" },
        { value: "ACTIVATED", label: "Activated — live, sends the activation email" },
        { value: "SUSPENDED", label: "Suspended — exists, cannot log in" },
      ],
      hint: "Staged is the default here: an account that goes live the moment it is created is " +
        "the harder mistake to notice.",
    },
    {
      key: "password",
      label: "Password",
      type: "secret",
      default: "",
      hint: "Setting one skips the activation email. Leave blank to let JumpCloud invite them.",
    },
    { key: "displayname", label: "Display Name", type: "string", default: "" },
    { key: "department", label: "Department", type: "string", default: "" },
    { key: "jobTitle", label: "Job Title", type: "string", default: "" },
    { key: "company", label: "Company", type: "string", default: "" },
    { key: "employeeIdentifier", label: "Employee Identifier", type: "string", default: "" },
    {
      key: "sudo",
      label: "Grant Sudo",
      type: "boolean",
      default: false,
      hint: "Administrator on every device this user is bound to.",
    },
    {
      key: "attributes",
      label: "Custom Attributes",
      type: "json",
      default: "",
      placeholder: '[{"name":"costCenter","value":"1234"}]',
    },
  ],
  output: [
    { key: "_id", type: "string", label: "User ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "email", type: "string", label: "Email" },
    { key: "state", type: "string", label: "State" },
    { key: "created", type: "string", label: "Created" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const username = String(p.username ?? "").trim();
    const email = String(p.email ?? "").trim();
    if (!username) throw new Error("`username` is required");
    if (!email) throw new Error("`email` is required");

    const body = compact({
      username,
      email,
      firstname: p.firstname,
      lastname: p.lastname,
      // The host applies `default`, but a bare execute() call does not.
      state: String(p.state ?? "STAGED"),
      password: p.password,
      displayname: p.displayname,
      department: p.department,
      jobTitle: p.jobTitle,
      company: p.company,
      employeeIdentifier: p.employeeIdentifier,
      sudo: p.sudo === true || undefined,
      attributes: json(p.attributes, "attributes"),
    });

    // The password is in the body and must never reach a log line.
    ctx.log("info", "creating a JumpCloud user", { username, state: body.state });

    return await new JumpCloudClient(ctx).request("/systemusers", { method: "POST", body });
  },
};

export default action;
