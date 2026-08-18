import type { Param } from "@w6w/types";

/**
 * Params shared across actions. Kept here so the wording of the ones that carry
 * a warning stays identical everywhere they appear.
 */

/** BCP-47. Affects the language of returned names and addresses, not the search. */
export const LANGUAGE_PARAM: Param = {
  key: "languageCode",
  label: "Language",
  type: "string",
  default: "",
  advanced: true,
  hint: "BCP-47, e.g. `en`, `fr`, `ja`. Changes the language of the returned text.",
};

/**
 * CLDR region. Biases results and, for addresses, changes how they are
 * formatted — a real behavioural difference rather than a cosmetic one.
 */
export const REGION_PARAM: Param = {
  key: "regionCode",
  label: "Region",
  type: "string",
  default: "",
  advanced: true,
  hint: "CLDR two-letter code, e.g. `us`, `gb`, `de`. Biases results toward that region and " +
    "changes how addresses are formatted.",
};

/** The mask that decides both the response and the price. */
export function fieldMaskParam(defaultMask: string, hint: string): Param {
  return {
    key: "fieldMask",
    label: "Fields",
    type: "string",
    default: defaultMask,
    hint,
  };
}
