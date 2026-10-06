import type { OutputField, Param } from "@w6w/types";

/** `page` / `size`, shared by every list endpoint. `size` is an enum of 10/20/50/100/200. */
export function paginationParams(): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Page number, starting at 0. Defaults to 0.",
      advanced: true,
    },
    {
      key: "size",
      label: "Page size",
      type: "select",
      default: "20",
      options: ["10", "20", "50", "100", "200"].map((v) => ({ value: v, label: v })),
      hint: "Records per page. The vendor allows 10, 20, 50, 100 or 200 and defaults to 20.",
      advanced: true,
    },
  ];
}

export function sortParam(example = "created,desc"): Param {
  return {
    key: "sort",
    label: "Sort",
    type: "string",
    placeholder: example,
    hint: "Field name and direction, e.g. `created,desc`.",
    advanced: true,
  };
}

/** The outputs every list action returns. */
export function pageOutput(label: string): OutputField[] {
  return [
    { key: "content", type: "array", label },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "totalElements", type: "number", label: "Total elements" },
    { key: "numberOfElements", type: "number", label: "Records in this page" },
  ];
}

export const phoneNumberParam: Param = {
  key: "phoneNumber",
  label: "Phone number",
  type: "string",
  required: true,
  placeholder: "2125551234",
  hint: "The contact's phone number, digits only (or with a leading +1).",
};

export const groupIdParam: Param = {
  key: "id",
  label: "Contact group ID",
  type: "string",
  required: true,
};

export const phoneNumbersParam = (label = "Phone numbers", required = true): Param => ({
  key: "phoneNumbers",
  label,
  type: "array",
  item: { type: "string", placeholder: "2125551234" },
  required,
  hint: "Phone numbers; a comma-separated string is also accepted.",
});

/** The shared output of a "worked, nothing to return" action. */
export const statusOutput: OutputField[] = [
  { key: "status", type: "number", label: "HTTP status" },
];
