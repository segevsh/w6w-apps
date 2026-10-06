import type { Param } from "@w6w/types";
import { createAction } from "../lib/factory.ts";

export const prospectAttrParams: Param[] = [
  { key: "firstName", label: "First name", type: "string" },
  { key: "lastName", label: "Last name", type: "string" },
  { key: "title", label: "Job title", type: "string" },
  { key: "company", label: "Company name", type: "string" },
  {
    key: "emails",
    label: "Emails",
    type: "json",
    placeholder: '["jane@acme.com"]',
    hint: "JSON array of email addresses.",
  },
  {
    key: "tags",
    label: "Tags",
    type: "json",
    placeholder: '["Interested"]',
    hint: "JSON array of tag strings.",
  },
];

export const prospectRelParams = [
  { param: "accountId", rel: "account", type: "account" },
  { param: "ownerId", rel: "owner", type: "user" },
  { param: "stageId", rel: "stage", type: "stage" },
];

export const prospectRelFieldParams: Param[] = [
  { key: "accountId", label: "Account ID", type: "number", validation: { integer: true, min: 1 } },
  {
    key: "ownerId",
    label: "Owner (user) ID",
    type: "number",
    validation: { integer: true, min: 1 },
  },
  { key: "stageId", label: "Stage ID", type: "number", validation: { integer: true, min: 1 } },
];

export default createAction({
  key: "prospect-create",
  title: "Create Prospect",
  noun: "Prospect",
  type: "prospect",
  path: "prospects",
  description:
    "Create a prospect. Outreach has no idempotency key, so retrying a create can produce a duplicate; look the prospect up first when that matters.",
  attrParams: prospectAttrParams,
  relParams: prospectRelParams,
  relFieldParams: prospectRelFieldParams,
});
