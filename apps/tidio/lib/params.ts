import type { Param } from "@w6w/types";

type Opts = {
  required?: boolean;
  hint?: string;
  default?: string | number | boolean;
  validation?: Record<string, unknown>;
};

export const str = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "string", ...o }) as Param;
export const text = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "text", ...o }) as Param;
export const int = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "number", ...o, validation: { integer: true, ...o.validation } }) as Param;
export const json = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "json", ...o }) as Param;
export const bool = (key: string, label: string, o: Opts = {}): Param =>
  ({ key, label, type: "boolean", ...o }) as Param;
export const select = (
  key: string,
  label: string,
  values: string[],
  o: Opts = {},
): Param =>
  ({
    key,
    label,
    type: "select",
    options: values.map((v) => ({ value: v, label: v })),
    ...o,
  }) as Param;

export const cursorParam: Param = str("cursor", "Cursor", {
  hint: "The previous result's nextCursor. Leave empty for the first page.",
});

export const emailConsent: Param = select("email_consent", "Email consent", [
  "subscribed",
  "unsubscribed",
], { hint: "Whether the contact agreed to the newsletter." });

export const contactFields: Param[] = [
  str("email", "Email", { hint: "RFC 822 email address." }),
  str("phone", "Phone", { validation: { maxLength: 155 } }),
  str("first_name", "First name", { validation: { maxLength: 127 } }),
  str("last_name", "Last name", { validation: { maxLength: 127 } }),
  emailConsent,
  json("properties", "Properties", {
    hint: 'Custom contact properties: [{"name":"plan","value":"pro"}] or {"plan":"pro"}. ' +
      "Names come from Get Contact Properties; values are strings up to 1000 characters.",
  }),
];

export const listOutput = (itemLabel: string) => [
  { key: "items", type: "array" as const, label: itemLabel },
  { key: "count", type: "number" as const, label: "Items on this page" },
  { key: "hasMore", type: "boolean" as const, label: "True when another page exists" },
  { key: "nextCursor", type: "string" as const, label: "Cursor for the next page, or null" },
];
