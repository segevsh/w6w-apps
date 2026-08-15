import type { Option, Param } from "@w6w/types";

/**
 * Shared fragments for the Users actions, copied from the `CreateUserRequest`
 * / `UpdateUserRequest` / `UserResponse` schemas in Thinkific's OpenAPI
 * document (fetched 2026-08-15).
 */

/** `roles` enum, shared by create/update/list-filter. */
export const roleOptions: Option[] = [
  { value: "affiliate", label: "Affiliate" },
  { value: "course_admin", label: "Course Admin" },
  { value: "group_analyst", label: "Group Analyst" },
  { value: "site_admin", label: "Site Admin" },
];

/** SSO / External ID provider enum, shared by get/update/delete's `provider` param. */
export const providerOptions: Option[] = [
  { value: "SSO", label: "SSO" },
  { value: "OPENID_CONNECT", label: "OpenID Connect" },
];

export const rolesParam: Param = {
  key: "roles",
  label: "Roles",
  type: "multiselect",
  options: roleOptions,
};

/**
 * One `custom_profile_fields[]` entry: `{custom_profile_field_definition_id,
 * value}`. `custom_profile_field_definition_id` is looked up via the
 * `custom-profile-field-definitions-list` companion — no, this app does not
 * ship that action (it is metadata for building the picker, not a resource a
 * workflow typically reads or writes); the id is best copied from Site
 * Settings > Enrollment > Signup Fields.
 */
export const customProfileFieldsParam: Param = {
  key: "custom_profile_fields",
  label: "Custom profile fields",
  type: "array",
  item: {
    type: "object",
    fields: [
      {
        key: "custom_profile_field_definition_id",
        label: "Definition ID",
        type: "number",
        required: true,
      },
      { key: "value", label: "Value", type: "string" },
    ],
  },
  hint: "Values for this Site's custom signup fields. Find each field's numeric definition ID " +
    "in Site Settings > Enrollment > Signup Fields.",
};
