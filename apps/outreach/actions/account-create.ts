import type { Param } from "@w6w/types";
import { createAction } from "../lib/factory.ts";

export const accountAttrParams: Param[] = [
  { key: "name", label: "Name", type: "string" },
  { key: "domain", label: "Domain", type: "string", placeholder: "acme.com" },
  { key: "websiteUrl", label: "Website URL", type: "string" },
  { key: "description", label: "Description", type: "text" },
  { key: "industry", label: "Industry", type: "string" },
  {
    key: "numberOfEmployees",
    label: "Number of employees",
    type: "number",
    validation: { integer: true, min: 0 },
  },
  {
    key: "tags",
    label: "Tags",
    type: "json",
    placeholder: '["Enterprise"]',
    hint: "JSON array of tag strings.",
  },
];

export const accountRelParams = [{ param: "ownerId", rel: "owner", type: "user" }];

export const accountRelFieldParams: Param[] = [
  {
    key: "ownerId",
    label: "Owner (user) ID",
    type: "number",
    validation: { integer: true, min: 1 },
  },
];

export default createAction({
  key: "account-create",
  title: "Create Account",
  noun: "Account",
  type: "account",
  path: "accounts",
  description: "Create an account (company). Retrying a create can produce a duplicate.",
  attrParams: accountAttrParams,
  relParams: accountRelParams,
  relFieldParams: accountRelFieldParams,
});
