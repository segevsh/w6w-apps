import type { OutputField, Param } from "@w6w/types";

/**
 * Shared `Param` fragments and output fields for the Wappalyzer actions.
 *
 * Every field, enum and default here is copied from Wappalyzer's own OpenAPI
 * 3.1 contract (`www.wappalyzer.com/openapi/v2-public.yaml`, fetched
 * 2026-09-29) and its human-authored reference pages, not inferred.
 */

/** `wappalyzer-credits-spent` / `wappalyzer-credits-remaining` — only where the OpenAPI document declares them. */
export const creditsOutputFields: OutputField[] = [
  { key: "creditsSpent", type: "number", label: "Credits spent" },
  { key: "creditsRemaining", type: "number", label: "Credits remaining" },
];

export const listIdParam: Param = {
  key: "id",
  label: "List ID",
  type: "string",
  required: true,
  placeholder: "lst_abcdef",
  hint: "The lead list's unique identifier, from a List Lead Lists or Create Lead List result.",
};

/** `matchTechnologies` — operator for the technology filter on a lead list. */
export const matchTechnologiesOptions = [
  { value: "or", label: "Or — match any listed technology" },
  { value: "and", label: "And — match all listed technologies" },
  { value: "not", label: "Not — match the first technology, exclude sites using the rest" },
];

/** `subdomains` — how a lead list treats subdomains relative to their root domain. */
export const listSubdomainsOptions = [
  { value: "include", label: "Include (default)" },
  { value: "exclude", label: "Exclude" },
  { value: "merge", label: "Merge into the root domain's result" },
];

export const listFormatOptions = [
  { value: "csv", label: "CSV (default)" },
  { value: "json", label: "JSON" },
];
