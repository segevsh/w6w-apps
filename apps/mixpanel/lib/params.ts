import type { Param } from "@w6w/types";

/**
 * The date window every query endpoint requires.
 *
 * Mixpanel infers nothing here: both dates are mandatory, both are inclusive,
 * and both are `yyyy-mm-dd` in the **project's** timezone (except the raw
 * export, which is UTC — a difference worth knowing when the two disagree at a
 * day boundary).
 */
export const DATE_RANGE_PARAMS: Param[] = [
  {
    key: "fromDate",
    label: "From Date",
    type: "date",
    required: true,
    default: "",
    placeholder: "2026-08-01",
    hint: "Inclusive, `yyyy-mm-dd`, in the project's timezone.",
  },
  {
    key: "toDate",
    label: "To Date",
    type: "date",
    required: true,
    default: "",
    placeholder: "2026-08-18",
    hint: "Inclusive.",
  },
];

/**
 * Mixpanel's segmentation expression, used by `where` on several endpoints.
 *
 * It is its own small language — `properties["$browser"] == "Chrome"` — and
 * not SQL, not JSON. Property names are bracketed and quoted; a bare name is a
 * syntax error rather than a lookup.
 */
export const WHERE_PARAM: Param = {
  key: "where",
  label: "Filter Expression",
  type: "string",
  default: "",
  placeholder: 'properties["$browser"] == "Chrome"',
  hint: "Mixpanel's segmentation expression language — properties are bracketed and quoted, " +
    'e.g. `properties["plan"] == "pro" and properties["seats"] > 5`.',
};
