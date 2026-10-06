import type { AuthDefinition } from "@w6w/types";
import {
  businessUnitField,
  connectionDisplay,
  environmentField,
  type PardotCredential,
  stamp,
  testCredential,
} from "./shared.ts";

/**
 * A Salesforce access token you already mint (for example from a JWT bearer or
 * client-credentials connected app that carries `pardot_api`), plus the business
 * unit id and the Account Engagement host. Access tokens expire; for scheduled
 * work prefer an OAuth method, which the host can refresh.
 */
const accessToken: AuthDefinition = {
  key: "access-token",
  type: "bearer",
  displayName: "Access Token & Business Unit",
  description:
    "Paste a Salesforce access token (pardot_api scope) and your Account Engagement business unit id. Short-lived — prefer OAuth for scheduled work.",
  connectionLabel: "Account Engagement ({{org.name}})",
  fields: [
    {
      key: "accessToken",
      label: "Salesforce access token",
      type: "secret",
      required: true,
      hint: "An OAuth access token issued by Salesforce with the `pardot_api` scope.",
    },
    businessUnitField,
    environmentField,
  ],

  sign({ request, credential }) {
    return stamp(request, credential as PardotCredential);
  },

  test({ credential }, ctx) {
    return testCredential(credential as PardotCredential, ctx);
  },

  afterConnect({ credential }) {
    return connectionDisplay(credential as PardotCredential);
  },
};

export default accessToken;
