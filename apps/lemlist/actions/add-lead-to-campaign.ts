import type { ActionDefinition } from "@w6w/types";
import { compact, LemlistClient, withCustomVariables } from "../lib/client.ts";

interface Input {
  campaignId: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  jobTitle?: string;
  linkedinUrl?: string;
  phone?: string;
  companyDomain?: string;
  picture?: string;
  icebreaker?: string;
  timezone?: string;
  contactOwner?: string;
  customVariables?: Record<string, unknown>;
  deduplicate?: boolean;
  linkedinEnrichment?: boolean;
  findEmail?: boolean;
  verifyEmail?: boolean;
  findPhone?: boolean;
}

/**
 * `POST /campaigns/{campaignId}/leads/` — trailing slash, as documented.
 *
 * ## Not idempotent, and `deduplicate` is not a fix for that
 *
 * Calling this twice with the same email adds the lead twice unless
 * `deduplicate=true` is set, and even then lemlist's own wording scopes the
 * check to *other* campaigns: "Search email address in other campaigns. Will not
 * insert the lead if email address already exists." There is no
 * idempotency-key mechanism, so `idempotent: false` is the honest declaration
 * and a retry after a timeout may double-add.
 *
 * ## The enrichment flags cost credits
 *
 * `linkedinEnrichment`, `findEmail`, `verifyEmail` and `findPhone` all default
 * to `false` and all consume the team's enrichment credits when set — the same
 * credits `health/quota.ts` reports. They are surfaced in a collapsed section so
 * nobody spends them by accident.
 */
const addLeadToCampaign: ActionDefinition<Input> = {
  key: "add-lead-to-campaign",
  type: "perform",
  resource: "lead",
  title: "Add Lead to Campaign",
  description:
    "Create a lead in a campaign. Any extra key you pass under Custom variables is stored on the lead and usable in the sequence as {{name}}.",
  idempotent: false,
  params: [
    {
      key: "campaignId",
      label: "Campaign id",
      type: "string",
      required: true,
      placeholder: "cam_A1B2C3D4E5F6G7H8I9",
    },
    { key: "email", label: "Email", type: "string", placeholder: "john.doe@example.com" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "companyName", label: "Company name", type: "string" },
    { key: "jobTitle", label: "Job title", type: "string" },
    {
      key: "linkedinUrl",
      label: "LinkedIn URL",
      type: "string",
      placeholder: "https://www.linkedin.com/in/johndoe",
    },
    { key: "phone", label: "Phone", type: "string" },
    { key: "companyDomain", label: "Company domain", type: "string" },
    { key: "picture", label: "Picture URL", type: "string" },
    { key: "icebreaker", label: "Icebreaker", type: "text" },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      placeholder: "Europe/Paris",
      hint: "IANA format, e.g. `America/New_York`.",
    },
    {
      key: "contactOwner",
      label: "Contact owner",
      type: "string",
      hint: "A user id (`usr_...`) or that user's login email.",
    },
    {
      key: "customVariables",
      label: "Custom variables",
      type: "json",
      hint:
        'JSON object, e.g. `{"companySize": "50-100"}`. Each key becomes a lead variable usable ' +
        "as `{{companySize}}`. lemlist keeps only letters, digits, `_`, `-`, space and `#` in a " +
        "name and replaces anything else with `_`.",
    },
    {
      key: "enrichment",
      label: "Enrichment",
      type: "section",
      section: "collapsible",
      title: "Enrichment",
      subtitle: "Consumes the team's credits",
      collapsed: true,
      children: [
        {
          key: "deduplicate",
          label: "Deduplicate",
          type: "boolean",
          hint: "Search the email in OTHER campaigns and skip the insert if it already exists. " +
            "lemlist defaults to false.",
        },
        {
          key: "linkedinEnrichment",
          label: "LinkedIn enrichment",
          type: "boolean",
          hint: "Runs LinkedIn enrichment. Consumes credits. Defaults to false.",
        },
        {
          key: "findEmail",
          label: "Find email",
          type: "boolean",
          hint: "Finds a verified email. Consumes credits. Defaults to false.",
        },
        {
          key: "verifyEmail",
          label: "Verify email",
          type: "boolean",
          hint: "Verifies the existing email (debounce). Consumes credits. Defaults to false.",
        },
        {
          key: "findPhone",
          label: "Find phone",
          type: "boolean",
          hint: "Finds a phone number. Consumes credits. Defaults to false.",
        },
      ],
    },
  ],
  output: [
    { key: "_id", type: "string", label: "Lead id" },
    { key: "email", type: "string", label: "Email" },
    { key: "campaignId", type: "string", label: "Campaign id" },
    { key: "campaignName", type: "string", label: "Campaign name" },
  ],

  execute(input, ctx) {
    const body = withCustomVariables(
      compact({
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        companyName: input.companyName,
        jobTitle: input.jobTitle,
        linkedinUrl: input.linkedinUrl,
        phone: input.phone,
        companyDomain: input.companyDomain,
        picture: input.picture,
        icebreaker: input.icebreaker,
        timezone: input.timezone,
        contactOwner: input.contactOwner,
      }),
      input.customVariables,
    );

    return new LemlistClient(ctx).request(
      `/campaigns/${encodeURIComponent(input.campaignId)}/leads/`,
      {
        method: "POST",
        query: {
          deduplicate: input.deduplicate,
          linkedinEnrichment: input.linkedinEnrichment,
          findEmail: input.findEmail,
          verifyEmail: input.verifyEmail,
          findPhone: input.findPhone,
        },
        body,
      },
    );
  },
};

export default addLeadToCampaign;
