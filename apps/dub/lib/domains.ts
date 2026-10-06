import type { Param } from "@w6w/types";

/** Settings shared by domain create and update. */
export const DOMAIN_PARAMS: Param[] = [
  {
    key: "expiredUrl",
    label: "Expired-link redirect",
    type: "string",
    hint: "Where visitors go when a link on this domain has expired.",
    validation: { maxLength: 32000 },
  },
  {
    key: "notFoundUrl",
    label: "Not-found redirect",
    type: "string",
    hint: "Where visitors go when a link on this domain does not exist.",
    validation: { maxLength: 32000 },
  },
  {
    key: "archived",
    label: "Archived",
    type: "boolean",
    hint: "false un-archives a previously archived domain.",
  },
  {
    key: "placeholder",
    label: "Placeholder URL",
    type: "string",
    hint: "Example link shown to teammates in the link creation modal.",
    validation: { maxLength: 100 },
  },
  {
    key: "assetLinks",
    label: "assetLinks.json",
    type: "text",
    hint: "Android deep-link configuration file.",
    advanced: true,
  },
  {
    key: "appleAppSiteAssociation",
    label: "apple-app-site-association",
    type: "text",
    hint: "iOS deep-link configuration file.",
    advanced: true,
  },
];

export const DOMAIN_OUTPUT = [
  { key: "id", type: "string" as const, label: "Domain ID" },
  { key: "slug", type: "string" as const, label: "Domain name" },
  { key: "verified", type: "boolean" as const, label: "DNS verified" },
  { key: "primary", type: "boolean" as const, label: "Primary domain" },
  { key: "archived", type: "boolean" as const, label: "Archived" },
  { key: "expiredUrl", type: "string" as const, label: "Expired-link redirect" },
  { key: "notFoundUrl", type: "string" as const, label: "Not-found redirect" },
];
