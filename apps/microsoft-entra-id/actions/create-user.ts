import type { ActionDefinition } from "@w6w/types";
import { compact, entraError, GraphClient, jsonObject } from "../lib/client.ts";
import { additionalPropertiesParam } from "../lib/params.ts";

interface Input {
  displayName: string;
  userPrincipalName: string;
  mailNickname: string;
  password: string;
  forceChangePasswordNextSignIn?: boolean;
  accountEnabled?: boolean;
  givenName?: string;
  surname?: string;
  jobTitle?: string;
  department?: string;
  companyName?: string;
  officeLocation?: string;
  mobilePhone?: string;
  usageLocation?: string;
  additionalProperties?: unknown;
}

/**
 * `POST /users`
 *
 * https://learn.microsoft.com/en-us/graph/api/user-post-users?view=graph-rest-1.0
 *
 * Answers `201 Created` with the new user. Graph requires exactly these properties on create:
 * `accountEnabled`, `displayName`, `mailNickname`, `passwordProfile` and `userPrincipalName`
 * (the UPN's domain must be a verified domain of the tenant; `onPremisesImmutableId` is also
 * required for a federated domain). Least privileged delegated scope: `User.Create`; this App
 * requests `User.ReadWrite.All`, which the reference lists as sufficient.
 *
 * `usageLocation` is not required to create a user but **is** required before a license can be
 * assigned, so it is offered here. `idempotent: false`: Graph offers no client-supplied dedupe
 * key, so a blind retry is not guaranteed safe.
 */
const createUser: ActionDefinition<Input, Record<string, unknown>> = {
  key: "create-user",
  type: "perform",
  resource: "user",
  title: "Create User",
  description: "Create a user in the directory.",
  idempotent: false,
  params: [
    { key: "displayName", label: "Display name", type: "string", required: true },
    {
      key: "userPrincipalName",
      label: "User principal name",
      type: "string",
      required: true,
      placeholder: "adele@contoso.com",
      hint:
        "`alias@domain`, where the domain is a verified domain of your tenant. Only A-Z a-z 0-9 and ' . - _ ! # ^ ~ are allowed in the alias.",
    },
    {
      key: "mailNickname",
      label: "Mail nickname",
      type: "string",
      required: true,
      hint: "The mail alias for the user.",
    },
    {
      key: "password",
      label: "Initial password",
      type: "secret",
      required: true,
      hint: "Must satisfy the tenant's password policy (a strong password by default).",
    },
    {
      key: "forceChangePasswordNextSignIn",
      label: "Force password change at next sign-in",
      type: "boolean",
      default: true,
      hint: "Microsoft's stated best practice is to always set this to true.",
    },
    {
      key: "accountEnabled",
      label: "Account enabled",
      type: "boolean",
      default: true,
    },
    { key: "givenName", label: "First name", type: "string" },
    { key: "surname", label: "Last name", type: "string" },
    { key: "jobTitle", label: "Job title", type: "string" },
    { key: "department", label: "Department", type: "string" },
    { key: "companyName", label: "Company name", type: "string", advanced: true },
    { key: "officeLocation", label: "Office location", type: "string", advanced: true },
    { key: "mobilePhone", label: "Mobile phone", type: "string", advanced: true },
    {
      key: "usageLocation",
      label: "Usage location",
      type: "string",
      advanced: true,
      placeholder: "US",
      hint: "Two-letter ISO 3166 country code. Required before a license can be assigned.",
    },
    additionalPropertiesParam,
  ],
  output: [
    { key: "id", type: "string", label: "Object id" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "userPrincipalName", type: "string", label: "User principal name" },
  ],

  async execute(input, ctx) {
    for (const k of ["displayName", "userPrincipalName", "mailNickname", "password"] as const) {
      if (!input[k]?.trim()) throw new Error(entraError(`${k} is required.`));
    }
    const extra = jsonObject(input.additionalProperties, "Additional properties");
    const client = new GraphClient(ctx);
    ctx.log("info", "creating user", { userPrincipalName: input.userPrincipalName });

    return await client.request("/users", {
      method: "POST",
      body: {
        ...compact({
          accountEnabled: input.accountEnabled ?? true,
          displayName: input.displayName,
          mailNickname: input.mailNickname,
          userPrincipalName: input.userPrincipalName,
          givenName: input.givenName,
          surname: input.surname,
          jobTitle: input.jobTitle,
          department: input.department,
          companyName: input.companyName,
          officeLocation: input.officeLocation,
          mobilePhone: input.mobilePhone,
          usageLocation: input.usageLocation,
        }),
        passwordProfile: {
          forceChangePasswordNextSignIn: input.forceChangePasswordNextSignIn ?? true,
          password: input.password,
        },
        ...extra,
      },
    });
  },
};

export default createUser;
