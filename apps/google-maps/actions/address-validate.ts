import type { ActionDefinition } from "@w6w/types";
import { compact, HOSTS, MapsClient } from "../lib/client.ts";
import { LANGUAGE_PARAM } from "../lib/params.ts";

/**
 * `POST addressvalidation.googleapis.com/v1:validateAddress` — is this a real,
 * deliverable address, and what did Google have to change to make it one?
 *
 * ## This is the action `geocode` is not
 *
 * Geocoding answers "where is this", and it answers it for an address that does
 * not exist by quietly returning the nearest thing that does. Address
 * Validation answers "is this address correct", and — crucially — **says what
 * it changed**: which components it inferred, replaced, spell-corrected, or
 * could not confirm at all.
 *
 * The distinction matters wherever something physical is going to that address.
 * A geocoded near-miss produces a parcel sent to the wrong house with a
 * perfectly plausible set of coordinates attached.
 *
 * ## The verdict is four fields, and reading one of them is not enough
 *
 * - `addressComplete` — no unresolved tokens left over.
 * - `validationGranularity` — how precisely Google could confirm it:
 *   `SUB_PREMISE`, `PREMISE`, `PREMISE_PROXIMITY`, `BLOCK`, `ROUTE`, `OTHER`.
 *   `ROUTE` means it confirmed the street and not the building.
 * - `inputGranularity` — how precise the input was. Input at `PREMISE` and
 *   validation at `ROUTE` is the interesting case: a house number Google could
 *   not confirm.
 * - The `has*` flags — `hasInferredComponents`, `hasReplacedComponents`,
 *   `hasUnconfirmedComponents`, `hasSpellCorrectedComponents`.
 *
 * This action surfaces all of them and derives a single `deliverable` boolean
 * for the common case, with `concerns` listing what to look at when it is
 * false. The raw verdict is returned untouched for anyone who needs to be
 * stricter.
 *
 * ## USPS CASS mode is a different product wearing the same endpoint
 *
 * `enableUspsCass` switches on USPS-standardised validation for US addresses,
 * returning a separate `uspsData` block with the DPV confirmation codes a
 * mailer needs. It is billed differently and it is US-only.
 */
const action: ActionDefinition = {
  key: "address-validate",
  type: "search",
  resource: "address",
  title: "Validate an address",
  description:
    "Whether an address is real and deliverable, and WHAT GOOGLE CHANGED to make it so — the " +
    "question `geocode` cannot answer, because geocoding a wrong address returns a right-looking one.",
  params: [
    {
      key: "addressLines",
      label: "Address",
      type: "string",
      required: true,
      default: "",
      hint: "The address as written, one line per line. Unstructured is fine — that is what this " +
        "endpoint is for.",
    },
    {
      key: "regionCode",
      label: "Country",
      type: "string",
      default: "",
      hint: "CLDR two-letter code. Strongly recommended: without it Google has to guess the " +
        "country from the text, and address formats collide between countries.",
    },
    { key: "locality", label: "City", type: "string", default: "", advanced: true },
    {
      key: "administrativeArea",
      label: "State / Province",
      type: "string",
      default: "",
      advanced: true,
    },
    { key: "postalCode", label: "Postal Code", type: "string", default: "", advanced: true },
    {
      key: "enableUspsCass",
      label: "USPS CASS Mode",
      type: "boolean",
      default: false,
      hint: "US only. Returns USPS DPV confirmation codes, and is billed as a different SKU.",
    },
    {
      key: "previousResponseId",
      label: "Previous Response ID",
      type: "string",
      default: "",
      advanced: true,
      hint:
        "When re-validating after a correction, pass the previous `responseId` — it links the " +
        "attempts into one session for billing and for Google's own quality signals.",
    },
    LANGUAGE_PARAM,
  ],
  output: [
    {
      key: "deliverable",
      type: "boolean",
      label: "Complete, confirmed to premise, nothing unconfirmed",
    },
    { key: "concerns", type: "array", label: "Why it is not deliverable, when it is not" },
    { key: "formattedAddress", type: "string", label: "Google's corrected rendering" },
    { key: "validationGranularity", type: "string", label: "How precisely it was confirmed" },
    { key: "inputGranularity", type: "string", label: "How precise the input was" },
    { key: "verdict", type: "object", label: "The full verdict block" },
    { key: "responseId", type: "string", label: "Pass as Previous Response ID when re-validating" },
    { key: "uspsData", type: "object", label: "Present only in CASS mode" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const lines = String(p.addressLines ?? "").split(/\n/).map((s) => s.trim()).filter(Boolean);
    if (lines.length === 0) throw new Error("`addressLines` is required");

    const result = await new MapsClient(ctx).rpc<{
      responseId?: string;
      result?: {
        verdict?: {
          addressComplete?: boolean;
          validationGranularity?: string;
          inputGranularity?: string;
          hasInferredComponents?: boolean;
          hasReplacedComponents?: boolean;
          hasUnconfirmedComponents?: boolean;
          hasSpellCorrectedComponents?: boolean;
        };
        address?: { formattedAddress?: string };
        uspsData?: unknown;
      };
    }>(HOSTS.addressValidation, "/v1:validateAddress", {
      method: "POST",
      body: compact({
        address: compact({
          addressLines: lines,
          regionCode: p.regionCode,
          locality: p.locality,
          administrativeArea: p.administrativeArea,
          postalCode: p.postalCode,
          languageCode: p.languageCode,
        }),
        enableUspsCass: p.enableUspsCass === true ? true : undefined,
        previousResponseId: p.previousResponseId,
      }),
    });

    const verdict = result?.result?.verdict ?? {};
    const concerns = describeConcerns(verdict);
    const deliverable = concerns.length === 0;

    // The verdict shape, never the address — an address is somebody's home.
    ctx.log("info", "validated an address", {
      deliverable,
      validationGranularity: verdict.validationGranularity,
      concerns: concerns.length,
    });

    return {
      deliverable,
      concerns,
      formattedAddress: result?.result?.address?.formattedAddress,
      validationGranularity: verdict.validationGranularity,
      inputGranularity: verdict.inputGranularity,
      verdict,
      responseId: result?.responseId,
      uspsData: result?.result?.uspsData,
    };
  },
};

/** Granularities precise enough to identify a building. */
const PREMISE_LEVEL = new Set(["SUB_PREMISE", "PREMISE"]);

/**
 * Turn the verdict's four independent signals into a list a human can act on.
 *
 * Deliberately strict: `PREMISE_PROXIMITY` — "near the building, but not it" —
 * is treated as a concern, because a parcel needs the building.
 */
export function describeConcerns(verdict: {
  addressComplete?: boolean;
  validationGranularity?: string;
  inputGranularity?: string;
  hasInferredComponents?: boolean;
  hasReplacedComponents?: boolean;
  hasUnconfirmedComponents?: boolean;
  hasSpellCorrectedComponents?: boolean;
}): string[] {
  const concerns: string[] = [];
  if (verdict.addressComplete !== true) {
    concerns.push("the address has unresolved tokens Google could not place");
  }
  if (!PREMISE_LEVEL.has(String(verdict.validationGranularity ?? ""))) {
    concerns.push(
      `confirmed only to ${verdict.validationGranularity ?? "an unknown level"} — the building ` +
        "itself was not confirmed",
    );
  }
  if (verdict.hasUnconfirmedComponents) {
    concerns.push("at least one component could not be confirmed");
  }
  if (verdict.hasReplacedComponents) {
    concerns.push("Google replaced a component with a different value");
  }
  if (verdict.hasInferredComponents) {
    concerns.push("Google added a component that was not in the input");
  }
  if (verdict.hasSpellCorrectedComponents) {
    concerns.push("Google spell-corrected a component");
  }
  return concerns;
}

export default action;
