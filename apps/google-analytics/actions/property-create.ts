import type { ActionDefinition } from "@w6w/types";
import { compact, GoogleAnalyticsClient } from "../lib/client.ts";

/**
 * `POST /v1beta/properties` — verified against Google's Admin API discovery
 * document (`analyticsadmin.properties.create`). The `Property` schema marks
 * `displayName` and `timeZone` as required and `parent` as immutable.
 *
 * `propertyType` is left to Google's default rather than exposed: the schema
 * calls it immutable and the only value that makes sense for a new GA4
 * property is the ordinary one, so offering the enum would invite a choice
 * that cannot be undone.
 */
const action: ActionDefinition = {
  key: "property-create",
  type: "perform",
  resource: "property",
  title: "Create a property",
  description: "Create a new GA4 property under an account.",
  // A second call makes a second property — Google does not dedupe on name.
  idempotent: false,
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      default: "",
      hint: "The parent account. `accounts/` prefix optional.",
    },
    { key: "displayName", label: "Display Name", type: "string", required: true, default: "" },
    {
      key: "timeZone",
      label: "Reporting Time Zone",
      type: "string",
      required: true,
      default: "",
      placeholder: "America/New_York",
      hint: "An IANA time zone. It is the day boundary for every report on this property.",
    },
    {
      key: "currencyCode",
      label: "Currency Code",
      type: "string",
      default: "",
      placeholder: "USD",
      hint: "ISO 4217, for monetary metrics.",
    },
    {
      key: "industryCategory",
      label: "Industry Category",
      type: "string",
      default: "",
      placeholder: "TECHNOLOGY",
      hint: "Google's enum, e.g. AUTOMOTIVE, FOOD_AND_DRINK, TECHNOLOGY.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "parent", type: "string", label: "Parent" },
    { key: "timeZone", type: "string", label: "Reporting time zone" },
    { key: "currencyCode", type: "string", label: "Currency code" },
    { key: "createTime", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const account = String(p.accountId ?? "").trim().replace(/^accounts\//, "");
    const displayName = String(p.displayName ?? "").trim();
    const timeZone = String(p.timeZone ?? "").trim();
    if (!account) throw new Error("`accountId` is required");
    if (!displayName) throw new Error("`displayName` is required");
    if (!timeZone) throw new Error("`timeZone` is required");

    const body = compact({
      parent: `accounts/${account}`,
      displayName,
      timeZone,
      currencyCode: p.currencyCode,
      industryCategory: p.industryCategory,
    });

    ctx.log("info", "creating GA4 property", { account, displayName });

    return await new GoogleAnalyticsClient(ctx).admin("/properties", {
      method: "POST",
      body,
    });
  },
};

export default action;
