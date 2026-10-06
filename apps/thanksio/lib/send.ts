import type { ActionDefinition, Param } from "@w6w/types";
import { asOptionalJson, compact, ThanksioClient, toIntList } from "./client.ts";

/**
 * Shared shape of the six `POST /send/*` endpoints and their `POST /estimate/*` twins.
 *
 * The OpenAPI documents the same request body for both (the estimate "validates exactly as the
 * send does"), so one builder serves both. Field names below are verbatim from the spec.
 */
export const SPEND_WARNING =
  "SPENDS REAL MONEY and mails a physical piece to a real address when it is not a preview. ";

export const audienceParams: Param[] = [
  {
    key: "mailingListIds",
    label: "Mailing list IDs",
    type: "string",
    hint: "Comma-separated mailing list IDs to send to. Give this, Recipients or Radius search.",
  },
  {
    key: "recipients",
    label: "Recipients",
    type: "json",
    hint: 'Array of recipient objects, e.g. [{"mailing_list_id":1,"name":"Ada","address":"1 Main ' +
      'St","city":"Lenexa","province":"KS","postal_code":"66216"}]. An email-only recipient ' +
      "triggers a paid address lookup.",
  },
  {
    key: "radiusSearch",
    label: "Radius search",
    type: "json",
    hint: 'Object, e.g. {"address":"123 Main St, Lenexa KS 66216","record_count":50}. Buys ' +
      "records near an address — each record has its own fee.",
  },
];

export const styleParams: Param[] = [
  { key: "message", label: "Message", type: "text", hint: "Handwritten message text." },
  { key: "messageTemplateId", label: "Message template ID", type: "number" },
  { key: "imageTemplateId", label: "Image template ID", type: "number" },
  { key: "frontImageUrl", label: "Front image URL", type: "string" },
  { key: "handwritingStyleId", label: "Handwriting style ID", type: "number" },
  {
    key: "handwritingColor",
    label: "Handwriting color",
    type: "string",
    hint: "blue, black, green, purple, red, or a hex value such as #4287f5.",
  },
  { key: "handwritingRealism", label: "Handwriting realism", type: "boolean" },
  { key: "qrcodeUrl", label: "QR code URL", type: "string" },
];

export const optionParams: Param[] = [
  { key: "subAccount", label: "Sub-account ID", type: "number" },
  {
    key: "notificationEmails",
    label: "Notification emails",
    type: "string",
    hint: "Comma-separated addresses told about order events such as QR scans.",
  },
  { key: "sendStandardMail", label: "Standard Mail postage", type: "boolean" },
  { key: "returnName", label: "Return name", type: "string" },
  { key: "returnAddress", label: "Return address", type: "string" },
  { key: "returnAddress2", label: "Return address line 2", type: "string" },
  { key: "returnCity", label: "Return city", type: "string" },
  { key: "returnState", label: "Return state", type: "string" },
  { key: "returnPostalCode", label: "Return postal code", type: "string" },
  {
    key: "metadata",
    label: "Metadata",
    type: "json",
    hint: "Your own key/value data. Returned unchanged by the order endpoints and in every " +
      "webhook event for the order.",
  },
  {
    key: "extra",
    label: "Extra body fields",
    type: "json",
    hint: "Raw JSON merged into the request body for any documented field not listed here " +
      "(for example a send date).",
  },
];

export const previewParam: Param = {
  key: "preview",
  label: "Preview only",
  type: "boolean",
  hint: "Return a preview instead of placing the order. Use while building.",
};

/** The inputs every send/estimate action accepts. */
export interface MailerInput {
  mailingListIds?: string | number | number[];
  recipients?: unknown;
  radiusSearch?: unknown;
  message?: string;
  messageTemplateId?: number;
  imageTemplateId?: number;
  frontImageUrl?: string;
  handwritingStyleId?: number;
  handwritingColor?: string;
  handwritingRealism?: boolean;
  qrcodeUrl?: string;
  subAccount?: number;
  notificationEmails?: string;
  sendStandardMail?: boolean;
  returnName?: string;
  returnAddress?: string;
  returnAddress2?: string;
  returnCity?: string;
  returnState?: string;
  returnPostalCode?: string;
  metadata?: unknown;
  extra?: unknown;
  preview?: boolean;
  [key: string]: unknown;
}

/** Build the request body shared by every mailer type. Throws before any network call. */
export function mailerBody(input: MailerInput): Record<string, unknown> {
  const mailingListIds = toIntList(input.mailingListIds, "Mailing list IDs");
  const recipients = asOptionalJson<unknown[]>(input.recipients, "Recipients");
  const radiusSearch = asOptionalJson<Record<string, unknown>>(input.radiusSearch, "Radius search");
  if (!mailingListIds && !(recipients && recipients.length) && !radiusSearch) {
    throw new Error(
      "Give Mailing list IDs, Recipients or a Radius search — the order has no audience",
    );
  }
  const extra = asOptionalJson<Record<string, unknown>>(input.extra, "Extra body fields") ?? {};
  return {
    ...compact({
      preview: input.preview,
      mailing_list_ids: mailingListIds,
      recipients: recipients && recipients.length ? recipients : undefined,
      radius_search: radiusSearch,
      message: input.message,
      message_template_id: input.messageTemplateId,
      image_template_id: input.imageTemplateId,
      front_image_url: input.frontImageUrl,
      handwriting_style_id: input.handwritingStyleId,
      handwriting_color: input.handwritingColor,
      handwriting_realism: input.handwritingRealism,
      qrcode_url: input.qrcodeUrl,
      sub_account: input.subAccount,
      notification_emails: input.notificationEmails,
      send_standard_mail: input.sendStandardMail,
      return_name: input.returnName,
      return_address: input.returnAddress,
      return_address2: input.returnAddress2,
      return_city: input.returnCity,
      return_state: input.returnState,
      return_postal_code: input.returnPostalCode,
      metadata: asOptionalJson(input.metadata, "Metadata"),
    }),
    ...extra,
  };
}

export interface OrderOutput {
  orderId: number | undefined;
  status: string | undefined;
  order: Record<string, unknown>;
}

export const sendOutput = [
  { key: "orderId", type: "number", label: "Order ID (absent on a preview)" },
  { key: "status", type: "string", label: "Order status" },
  { key: "order", type: "object", label: "The vendor's full response" },
] as const;

/** POST a mailer body and shape the order response. */
export async function postMailer(
  ctx: Parameters<NonNullable<ActionDefinition["execute"]>>[1],
  path: string,
  body: Record<string, unknown>,
): Promise<OrderOutput> {
  const order = await new ThanksioClient(ctx).call(path, { method: "POST", body });
  return {
    orderId: typeof order.id === "number" ? order.id : undefined,
    status: typeof order.status === "string" ? order.status : undefined,
    order,
  };
}
