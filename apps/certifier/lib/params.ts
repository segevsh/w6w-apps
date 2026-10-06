import type { Param } from "@w6w/types";

export const credentialIdParam: Param = {
  key: "credentialId",
  label: "Credential ID",
  type: "string",
  required: true,
  hint: "The credential's `id` (not its `publicId`).",
};

export const groupIdParam: Param = {
  key: "groupId",
  label: "Credential template ID",
  type: "string",
  required: true,
  hint:
    'Certifier calls a credential template a "group". List them with List Credential Templates.',
};

export const designIdParam: Param = {
  key: "designId",
  label: "Design ID",
  type: "string",
  required: true,
};

export const cursorParam: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  advanced: true,
  hint: "The `pagination.next` value from the previous page. Leave empty for the first page.",
};

export const limitParam: Param = {
  key: "limit",
  label: "Page size",
  type: "number",
  advanced: true,
  hint: "Items per page. Certifier defaults to 20; the maximum is 100.",
};

export const recipientNameParam: Param = {
  key: "recipientName",
  label: "Recipient name",
  type: "string",
  required: true,
};

export const recipientEmailParam: Param = {
  key: "recipientEmail",
  label: "Recipient email",
  type: "string",
  hint: "Needed to send the credential by email. A credential without one cannot be sent.",
};

export const issueDateParam: Param = {
  key: "issueDate",
  label: "Issue date",
  type: "string",
  placeholder: "2026-10-06",
  hint: "YYYY-MM-DD only. Defaults to today.",
};

export const expiryDateParam: Param = {
  key: "expiryDate",
  label: "Expiry date",
  type: "string",
  placeholder: "2027-10-06",
  hint: "YYYY-MM-DD only. Defaults to the credential template's own expiry setting.",
};

export const customAttributesParam: Param = {
  key: "customAttributes",
  label: "Custom attributes",
  type: "json",
  hint: "JSON object: each key is a custom attribute's tag on the template, each value its text.",
};

export const designIdsParam: Param = {
  key: "designIds",
  label: "Design IDs",
  type: "multiselect",
  hint: "Ordered list of certificate and badge design IDs (comma separated or a list).",
};

export const learningEventUrlParam: Param = {
  key: "learningEventUrl",
  label: "Learning event URL",
  type: "string",
  hint: "Shown in the recipient's digital wallet. Must be a full URL.",
};

export const interactionEventOptions = [
  "credential_viewed",
  "credential_shared_to_linkedin",
  "credential_added_to_linkedin_profile",
  "credential_shared_to_facebook",
  "credential_shared_to_twitter",
  "credential_shared_to_messenger",
  "credential_shared_to_whatsapp",
  "credential_shared_to_pinterest",
  "credential_shared_to_telegram",
  "credential_shared_to_weibo",
  "credential_downloaded",
  "credential_link_copied",
  "credential_verified",
].map((value) => ({ value, label: value.replace(/^credential_/, "").replace(/_/g, " ") }));
