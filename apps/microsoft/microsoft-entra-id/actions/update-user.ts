import type { ActionDefinition } from "@w6w/types";
import { compact, entraError, GraphClient, jsonObject, userPath } from "../lib/client.ts";
import { additionalPropertiesParam, userIdParam } from "../lib/params.ts";

interface Input {
  userId: string;
  displayName?: string;
  accountEnabled?: boolean;
  givenName?: string;
  surname?: string;
  jobTitle?: string;
  department?: string;
  companyName?: string;
  officeLocation?: string;
  mobilePhone?: string;
  city?: string;
  state?: string;
  country?: string;
  usageLocation?: string;
  preferredLanguage?: string;
  additionalProperties?: unknown;
}

/**
 * `PATCH /users/{id | userPrincipalName}`
 *
 * https://learn.microsoft.com/en-us/graph/api/user-update?view=graph-rest-1.0
 *
 * Sends only what the caller set; Graph leaves every other property alone. Answers `204 No
 * Content`, so the action returns `{ updated: true, userId }` rather than the user — call Get User
 * to read the result back.
 *
 * Permission quirks the reference spells out: `User.ReadWrite.All` covers it, but changing
 * `accountEnabled` really wants `User.EnableDisableAccount.All` + `User.Read.All`, and an
 * administrator's own account additionally needs a higher admin role. Updating an administrator
 * account in a delegated context needs the signed-in user to hold a higher privileged role than
 * the target. To change a password use Reset User Password.
 */
const updateUser: ActionDefinition<Input, { updated: boolean; userId: string }> = {
  key: "update-user",
  type: "perform",
  resource: "user",
  title: "Update User",
  description: "Update properties of a user, including enabling or disabling the account.",
  idempotent: true,
  params: [
    userIdParam,
    { key: "displayName", label: "Display name", type: "string" },
    {
      key: "accountEnabled",
      label: "Account enabled",
      type: "boolean",
      hint: "Leave unset to keep the current value. `false` blocks sign-in.",
    },
    { key: "givenName", label: "First name", type: "string" },
    { key: "surname", label: "Last name", type: "string" },
    { key: "jobTitle", label: "Job title", type: "string" },
    { key: "department", label: "Department", type: "string" },
    { key: "companyName", label: "Company name", type: "string", advanced: true },
    { key: "officeLocation", label: "Office location", type: "string", advanced: true },
    { key: "mobilePhone", label: "Mobile phone", type: "string", advanced: true },
    { key: "city", label: "City", type: "string", advanced: true },
    { key: "state", label: "State or province", type: "string", advanced: true },
    { key: "country", label: "Country or region", type: "string", advanced: true },
    {
      key: "usageLocation",
      label: "Usage location",
      type: "string",
      advanced: true,
      hint: "Two-letter ISO 3166 country code. Required before a license can be assigned.",
    },
    { key: "preferredLanguage", label: "Preferred language", type: "string", advanced: true },
    additionalPropertiesParam,
  ],
  output: [
    { key: "updated", type: "boolean", label: "Updated" },
    { key: "userId", type: "string", label: "User id or principal name" },
  ],

  async execute(input, ctx) {
    const body = {
      ...compact({
        displayName: input.displayName,
        accountEnabled: input.accountEnabled,
        givenName: input.givenName,
        surname: input.surname,
        jobTitle: input.jobTitle,
        department: input.department,
        companyName: input.companyName,
        officeLocation: input.officeLocation,
        mobilePhone: input.mobilePhone,
        city: input.city,
        state: input.state,
        country: input.country,
        usageLocation: input.usageLocation,
        preferredLanguage: input.preferredLanguage,
      }),
      ...jsonObject(input.additionalProperties, "Additional properties"),
    };
    if (Object.keys(body).length === 0) {
      throw new Error(entraError("Set at least one property to update."));
    }
    const client = new GraphClient(ctx);
    ctx.log("info", "updating user", { userId: input.userId, fields: Object.keys(body) });
    await client.request(userPath(input.userId), { method: "PATCH", body });
    return { updated: true, userId: input.userId };
  },
};

export default updateUser;
