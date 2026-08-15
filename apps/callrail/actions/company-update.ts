import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

/**
 * `PUT /v3/a/{account_id}/companies/{company_id}.json` — Updating a Company.
 *
 * `swapExcludeJquery` and `keywordSpottingEnabled` are accepted here (they
 * are "returned for compatibility purposes but have no effect" per the
 * reference — CallRail's DNI script no longer needs jQuery, and Keyword
 * Spotting has been replaced by Automation Rules) but are deliberately not
 * exposed as params, since setting a documented no-op would mislead a
 * workflow author into thinking it does something.
 */
interface Input {
  accountId: string;
  companyId: string;
  name?: string;
  timeZone?: string;
  callscoreEnabled?: boolean;
  callscribeEnabled?: boolean;
  swapPpcOverride?: boolean;
  swapLandingOverride?: string;
  swapCookieDuration?: number;
  swapCookieDurationUnit?: "months" | "weeks" | "days";
  externalFormCapture?: boolean;
}

const companyUpdate: ActionDefinition<Input> = {
  key: "company-update",
  type: "perform",
  resource: "company",
  title: "Update Company",
  description: "Update a company's settings.",
  idempotent: true,
  params: [
    accountIdParam,
    {
      key: "companyId",
      label: "Company ID",
      type: "string",
      required: true,
      placeholder: "COM8154748ae6bd4e278a7cddd38a662f4f",
    },
    { key: "name", label: "Name", type: "string" },
    { key: "timeZone", label: "Time zone", type: "string", placeholder: "America/New_York" },
    {
      key: "callscoreEnabled",
      label: "CallScore enabled",
      type: "boolean",
    },
    {
      key: "callscribeEnabled",
      label: "Transcripts & Call Highlights enabled",
      type: "boolean",
    },
    {
      key: "swapPpcOverride",
      label: "Override source for PPC visitors",
      type: "boolean",
    },
    {
      key: "swapLandingOverride",
      label: "Landing page override parameter",
      type: "string",
      hint: 'The URL parameter to look for, e.g. "utm_source". Pass an empty value to disable.',
    },
    {
      key: "swapCookieDuration",
      label: "Swap cookie duration",
      type: "number",
      hint: "Maximum 6 months.",
    },
    {
      key: "swapCookieDurationUnit",
      label: "Swap cookie duration unit",
      type: "select",
      options: [
        { value: "months", label: "Months" },
        { value: "weeks", label: "Weeks" },
        { value: "days", label: "Days" },
      ],
    },
    {
      key: "externalFormCapture",
      label: "External form capture enabled",
      type: "boolean",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Company ID" },
    { key: "name", type: "string", label: "Company name" },
  ],

  execute(input, ctx) {
    return new CallRailClient(ctx).json(
      `/a/${encodeId(input.accountId)}/companies/${encodeId(input.companyId)}.json`,
      {
        method: "PUT",
        body: {
          name: input.name,
          time_zone: input.timeZone,
          callscore_enabled: input.callscoreEnabled,
          callscribe_enabled: input.callscribeEnabled,
          swap_ppc_override: input.swapPpcOverride,
          swap_landing_override: input.swapLandingOverride,
          swap_cookie_duration: input.swapCookieDuration,
          swap_cookie_duration_unit: input.swapCookieDurationUnit,
          external_form_capture: input.externalFormCapture,
        },
      },
    );
  },
};

export default companyUpdate;
