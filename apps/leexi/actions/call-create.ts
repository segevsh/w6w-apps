import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, LeexiClient, strList } from "../lib/client.ts";

interface Input {
  recording_s3_key: string;
  external_id: string;
  direction: "inbound" | "outbound";
  performed_at: string;
  user_uuid: string;
  title?: string;
  locale?:
    | "fr-FR"
    | "en-US"
    | "de-DE"
    | "es-ES"
    | "nl-NL"
    | "ar-AE"
    | "da-DK"
    | "hi-IN"
    | "id-ID"
    | "it-IT"
    | "ja-JP"
    | "ko-KR"
    | "nb-NO"
    | "pl-PL"
    | "pt-PT"
    | "ru-RU"
    | "sv-SE"
    | "tr-TR"
    | "uk-UA"
    | "zh-CN"
    | "fr-CA"
    | "he-IL"
    | "th-TH"
    | "bg-BG"
    | "cs-CZ"
    | "el-GR"
    | "et-EE"
    | "fi-FI"
    | "hr-HR"
    | "hu-HU"
    | "lt-LT"
    | "lv-LV"
    | "ro-RO"
    | "vi-VN"
    | "en-AU"
    | "en-GB"
    | "en-NZ"
    | "en-IN"
    | "ca-ES";
  tags?: string[] | string;
  customers?: unknown;
  participating_user_uuids?: string[] | string;
  custom_fields?: unknown;
}

/** `POST /calls` */
const callCreate: ActionDefinition<Input> = {
  key: "call-create",
  type: "perform",
  resource: "call",
  title: "Create Call",
  description:
    "Create a call or meeting from an already-uploaded recording. Asynchronous: the answer is only an acknowledgement and the call appears a few minutes later. Limited to 10 requests/minute.",
  idempotent: false,
  params: [
    {
      key: "recording_s3_key",
      label: "Recording S3 key",
      type: "string",
      required: true,
      hint:
        "The `recording_s3_key` returned by Request Recording Upload, after the file was PUT to the presigned URL.",
    },
    {
      key: "external_id",
      label: "External ID",
      type: "string",
      required: true,
      hint: "The id of the call in your system.",
    },
    {
      key: "direction",
      label: "Direction",
      type: "select",
      required: true,
      options: [{ value: "inbound", label: "inbound" }, { value: "outbound", label: "outbound" }],
    },
    {
      key: "performed_at",
      label: "Performed at",
      type: "string",
      required: true,
      hint: "ISO 8601 date-time the call took place.",
    },
    {
      key: "user_uuid",
      label: "Owner user UUID",
      type: "string",
      required: true,
      hint: "The Leexi user who owns the call; must have an active license.",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
    },
    {
      key: "locale",
      label: "Locale",
      type: "select",
      options: [
        { value: "fr-FR", label: "fr-FR" },
        { value: "en-US", label: "en-US" },
        { value: "de-DE", label: "de-DE" },
        { value: "es-ES", label: "es-ES" },
        { value: "nl-NL", label: "nl-NL" },
        { value: "ar-AE", label: "ar-AE" },
        { value: "da-DK", label: "da-DK" },
        { value: "hi-IN", label: "hi-IN" },
        { value: "id-ID", label: "id-ID" },
        { value: "it-IT", label: "it-IT" },
        { value: "ja-JP", label: "ja-JP" },
        { value: "ko-KR", label: "ko-KR" },
        { value: "nb-NO", label: "nb-NO" },
        { value: "pl-PL", label: "pl-PL" },
        { value: "pt-PT", label: "pt-PT" },
        { value: "ru-RU", label: "ru-RU" },
        { value: "sv-SE", label: "sv-SE" },
        { value: "tr-TR", label: "tr-TR" },
        { value: "uk-UA", label: "uk-UA" },
        { value: "zh-CN", label: "zh-CN" },
        { value: "fr-CA", label: "fr-CA" },
        { value: "he-IL", label: "he-IL" },
        { value: "th-TH", label: "th-TH" },
        { value: "bg-BG", label: "bg-BG" },
        { value: "cs-CZ", label: "cs-CZ" },
        { value: "el-GR", label: "el-GR" },
        { value: "et-EE", label: "et-EE" },
        { value: "fi-FI", label: "fi-FI" },
        { value: "hr-HR", label: "hr-HR" },
        { value: "hu-HU", label: "hu-HU" },
        { value: "lt-LT", label: "lt-LT" },
        { value: "lv-LV", label: "lv-LV" },
        { value: "ro-RO", label: "ro-RO" },
        { value: "vi-VN", label: "vi-VN" },
        { value: "en-AU", label: "en-AU" },
        { value: "en-GB", label: "en-GB" },
        { value: "en-NZ", label: "en-NZ" },
        { value: "en-IN", label: "en-IN" },
        { value: "ca-ES", label: "ca-ES" },
      ],
    },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      item: { type: "string" },
      hint: "Tag names.",
    },
    {
      key: "customers",
      label: "Customers",
      type: "json",
      hint:
        'External participants: [{"name":"Wei Kemmer","email":"wei@example.com"},{"phone_number":"+32474000000"},{"uuid":"<existing customer uuid>"}]. One attribute per entry is enough.',
    },
    {
      key: "participating_user_uuids",
      label: "Participating user UUIDs",
      type: "array",
      item: { type: "string" },
      hint: "Other Leexi users on the call besides the owner.",
    },
    {
      key: "custom_fields",
      label: "Custom fields",
      type: "json",
      hint:
        "Scalar key/value pairs. Only for custom integrations agreed with Leexi; unknown keys are stored but unused.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Empty: the call is created asynchronously" },
    { key: "message", type: "string", label: "Leexi's acknowledgement" },
  ],

  async execute(input, ctx) {
    const res = await new LeexiClient(ctx).request("POST", "/calls", {
      body: compact({
        recording_s3_key: input.recording_s3_key,
        external_id: input.external_id,
        direction: input.direction,
        performed_at: input.performed_at,
        user_uuid: input.user_uuid,
        title: input.title,
        locale: input.locale,
        tags: strList(input.tags),
        customers: jsonValue(input.customers),
        participating_user_uuids: strList(input.participating_user_uuids),
        custom_fields: jsonValue(input.custom_fields),
      }),
    });
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default callCreate;
