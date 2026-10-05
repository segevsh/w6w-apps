import type { Param } from "@w6w/types";

/** `address` is a nested object on the wire; the params are flat and folded in. */
const ADDRESS_KEYS = [
  ["addressType", "type"],
  ["streetAddress", "street_address"],
  ["locality", "locality"],
  ["region", "region"],
  ["postalCode", "postal_code"],
  ["country", "country"],
] as const;

export function addressFromInput(
  input: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const address: Record<string, unknown> = {};
  for (const [param, wire] of ADDRESS_KEYS) {
    const v = input[param];
    if (v !== undefined && v !== null && v !== "") address[wire] = v;
  }
  return Object.keys(address).length ? address : undefined;
}

export const addressParams: Param[] = [
  {
    key: "addressType",
    label: "Address type",
    type: "select",
    options: [
      { value: "WORK", label: "Work" },
      { value: "HOME", label: "Home" },
      { value: "OTHER", label: "Other" },
    ],
  },
  { key: "streetAddress", label: "Street address", type: "string" },
  { key: "locality", label: "City / locality", type: "string" },
  { key: "region", label: "State / region", type: "string" },
  { key: "postalCode", label: "Postal code", type: "string" },
  {
    key: "country",
    label: "Country",
    type: "string",
    hint: "Country code as Rippling returns it (e.g. US).",
  },
];
