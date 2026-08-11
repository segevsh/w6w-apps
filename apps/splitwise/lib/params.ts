import type { Option, Param } from "@w6w/types";
import { AMOUNT_PATTERN_SOURCE } from "./money.ts";

/**
 * Shared `Param` fragments and vendor enums for the Splitwise actions.
 *
 * Every enum here is copied from Splitwise's OpenAPI 3.0.1 document (extracted
 * 2026-08-11 from the Redoc payload of `https://dev.splitwise.com/`), not
 * inferred from behaviour.
 */

/**
 * `Group.group_type`. Note the vendor's own caveat on two of them:
 *
 * > **Note**: It is recommended to use `home` in place of `house` or
 * > `apartment`.
 *
 * They stay in the list because they are legal values a group may already
 * carry, but the labels say which one to pick.
 */
export const groupTypeOptions: Option[] = [
  { value: "home", label: "Home" },
  { value: "trip", label: "Trip" },
  { value: "couple", label: "Couple" },
  { value: "other", label: "Other" },
  { value: "apartment", label: "Apartment — Splitwise recommends `home` instead" },
  { value: "house", label: "House — Splitwise recommends `home` instead" },
];

/** `repeat_interval` on an expense. */
export const repeatIntervalOptions: Option[] = [
  { value: "never", label: "Never" },
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export const expenseIdParam: Param = {
  key: "expenseId",
  label: "Expense ID",
  type: "number",
  required: true,
  validation: { integer: true, min: 1 },
  hint: "The `id` field of an expense from List Expenses or Create Expense.",
};

export const groupIdParam: Param = {
  key: "groupId",
  label: "Group ID",
  type: "number",
  required: true,
  validation: { integer: true, min: 1 },
  hint: "From List Groups. Group `0` is not a real group — it is where Splitwise files expenses " +
    "that belong to no group.",
};

export const userIdParam: Param = {
  key: "userId",
  label: "User ID",
  type: "number",
  required: true,
  validation: { integer: true, min: 1 },
};

/**
 * The expense fields shared by Create Expense (both forms) and Update Expense —
 * the reference's `common` schema.
 */
export function expenseCommonParams(costRequired: boolean): Param[] {
  return [
    {
      key: "description",
      label: "Description",
      type: "string",
      required: costRequired,
      placeholder: "Grocery run",
      hint: "Short label shown in the Splitwise feed.",
    },
    {
      key: "cost",
      label: "Cost",
      type: "string",
      required: costRequired,
      placeholder: "25.00",
      validation: { pattern: AMOUNT_PATTERN_SOURCE },
      hint:
        "The total, as a decimal string with at most 2 decimal places — Splitwise types every " +
        "amount as a string, not a number.",
    },
    {
      key: "currency_code",
      label: "Currency",
      type: "string",
      placeholder: "USD",
      hint: "Must be one of the codes from List Currencies. Splitwise ships a few unofficial " +
        "codes (BTC rather than XBT), so do not assume plain ISO 4217.",
    },
    {
      key: "category_id",
      label: "Category ID",
      type: "number",
      validation: { integer: true, min: 1 },
      hint:
        "A **subcategory** id from List Categories. Splitwise rejects a parent category — use " +
        'that parent\'s "Other" subcategory when nothing more specific fits.',
    },
    {
      key: "date",
      label: "Date",
      type: "datetime",
      hint: "When the expense took place, ISO 8601 (e.g. 2026-05-02T13:00:00Z). Defaults to now, " +
        "and may differ from the creation time Splitwise records separately.",
    },
    {
      key: "details",
      label: "Notes",
      type: "text",
      advanced: true,
      hint: 'Free-form notes. Shown as "notes" in the Splitwise apps.',
    },
    {
      key: "repeat_interval",
      label: "Repeats",
      type: "select",
      options: repeatIntervalOptions,
      advanced: true,
      hint: "Turns this into a recurring expense. Leave empty for a one-off.",
    },
  ];
}

/** Values the {@link expenseCommonParams} block collects. */
export interface ExpenseCommonInput {
  description?: string;
  cost?: string;
  currency_code?: string;
  category_id?: number;
  date?: string;
  details?: string;
  repeat_interval?: string;
}

/** Project {@link ExpenseCommonInput} into request-body fields, dropping the unset. */
export function expenseCommonBody(input: ExpenseCommonInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (
    const key of [
      "description",
      "cost",
      "currency_code",
      "category_id",
      "date",
      "details",
      "repeat_interval",
    ] as const
  ) {
    const value = input[key];
    if (value !== undefined && value !== null && value !== "") out[key] = value;
  }
  return out;
}
