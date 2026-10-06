import type { Param } from "@w6w/types";

export const contractIdParam: Param = {
  key: "contractId",
  label: "Contract ID",
  type: "string",
  required: true,
  hint: 'The contract `id` returned by Create Contract, e.g. "1contr11-2222".',
};

export const templateIdParam: Param = {
  key: "templateId",
  label: "Template ID",
  type: "string",
  required: true,
  hint: "Shown when editing the template, and returned by List Templates.",
};

export const signerIdParam: Param = {
  key: "signerId",
  label: "Signer ID",
  type: "string",
  required: true,
  hint: "The signer `id` from the contract's `signers` list.",
};

const deliveryOptions = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
];

/** Contact fields common to Add Signer and Update Signer. */
export const signerFieldParams: Param[] = [
  { key: "name", label: "Name", type: "string" },
  { key: "email", label: "Email", type: "string" },
  {
    key: "mobile",
    label: "Mobile",
    type: "string",
    hint: "Non-US numbers must start with the country code, e.g. +44….",
  },
  { key: "companyName", label: "Company name", type: "string" },
  {
    key: "signatureRequestDeliveryMethods",
    label: "Signature request delivery",
    type: "multiselect",
    options: deliveryOptions,
    hint: "An empty selection skips sending the request. Default is calculated by the vendor.",
  },
  {
    key: "signedDocumentDeliveryMethod",
    label: "Signed document delivery",
    type: "select",
    options: deliveryOptions,
    hint: "Delivery of the final document is legally required in most regions.",
  },
  {
    key: "multiFactorAuthentications",
    label: "Multi-factor authentication",
    type: "multiselect",
    options: [
      { value: "sms_verification_code", label: "SMS verification code" },
      { value: "email_verification_code", label: "Email verification code" },
      { value: "photo_id", label: "Photo ID" },
    ],
    hint: "Requires the matching email/mobile on the signer.",
  },
  {
    key: "redirectUrl",
    label: "Redirect URL",
    type: "string",
    hint: "Where the signer lands after signing.",
  },
];

export const placeholderFieldsParam: Param = {
  key: "placeholderFields",
  label: "Placeholder fields",
  type: "json",
  hint: 'Array of {"placeholder_key", and one of "replace_with_text" | "replace_with_markdown" | ' +
    '"replace_with_template"}. The key is the text inside {{ }} in the template, without braces.',
};

export const editsParam: Param = {
  key: "edits",
  label: "Edits",
  type: "json",
  required: true,
  hint: 'Array of {"find_markdown", "replace_with_markdown"}. find_markdown matches literally; ' +
    "a blank replace_with_markdown removes the match.",
};

export const dryRunParam: Param = {
  key: "dryRun",
  label: "Dry run",
  type: "boolean",
  default: false,
  hint: "Preview the resulting markdown without saving anything.",
};

export const labelsParam: Param = {
  key: "labels",
  label: "Labels",
  type: "string",
  hint: "Comma-separated labels.",
};
