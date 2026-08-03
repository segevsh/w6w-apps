import type { ActionDefinition } from "@w6w/types";
import {
  MailjetClient,
  type MailjetEnvelope,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  campaign?: number;
  contact?: number;
  customId?: string;
  fromTs?: string;
  toTs?: string;
  fromType?: number;
  messageStatus?: number;
  senderId?: number;
  showSubject?: boolean;
  showCustomId?: boolean;
  showContactAlt?: boolean;
}

/** A v3 `message` object. Field names verified against dev.mailjet.com's reference. */
export interface MailjetMessageRecord {
  ID?: number;
  UUID?: string;
  Status?: string;
  ArrivedAt?: string;
  CampaignID?: number;
  ContactID?: number;
  ContactAlt?: string;
  DestinationID?: number;
  SenderID?: number;
  Subject?: string;
  MessageSize?: number;
  AttachmentCount?: number;
  AttemptCount?: number;
  Delay?: number;
  FilterTime?: number;
  IsClickTracked?: boolean;
  IsOpenTracked?: boolean;
  IsUnsubTracked?: boolean;
  IsHTMLPartIncluded?: boolean;
  IsTextPartIncluded?: boolean;
  SpamassassinScore?: number;
  SpamassRules?: string;
  StateID?: number;
  StatePermanent?: boolean;
}

/**
 * Search sent messages — Mailjet's delivery log.
 *
 * ## The `Show*` flags are opt-in, and their absence is confusing
 *
 * `Subject`, `CustomID` and `ContactAlt` (the recipient's email address) are
 * **omitted from the response unless you ask for them**, via `ShowSubject`,
 * `ShowCustomID` and `ShowContactAlt`. A caller who does not know this sees a
 * list of numeric IDs with no way to tell which message is which and reasonably
 * concludes the endpoint is broken. They are surfaced as first-class params here
 * for that reason.
 *
 * `ShowContactAlt` is the one to reach for when correlating against your own
 * records: without it you get `ContactID`, an opaque Mailjet integer, rather than
 * the address you sent to.
 *
 * ## Time filters
 *
 * `FromTS`/`ToTS` accept a Unix timestamp **or** an RFC3339 string, per Mailjet's
 * reference. They are passed through verbatim rather than normalised, since
 * either is valid and re-formatting a caller's timestamp is a good way to shift
 * a time zone by accident.
 *
 * `FromType` is `1` transactional, `2` marketing, `3` unknown — which is how you
 * separate this app's two halves in the log.
 */
const listMessages: ActionDefinition<Input> = {
  key: "list-messages",
  type: "read",
  resource: "message",
  title: "List Messages",
  description:
    "Search sent messages (GET /v3/REST/message). Subject, CustomID and the recipient address " +
    "are NOT returned unless you enable `showSubject` / `showCustomId` / `showContactAlt`.",
  params: [
    { key: "campaign", label: "Campaign ID", type: "number" },
    { key: "contact", label: "Contact ID", type: "number" },
    {
      key: "customId",
      label: "Custom ID",
      type: "string",
      hint: "The reference you attached at send time.",
    },
    {
      key: "fromTs",
      label: "From",
      type: "string",
      hint: "Unix timestamp or RFC3339, e.g. `2026-08-01T00:00:00Z`.",
    },
    { key: "toTs", label: "To", type: "string", hint: "Unix timestamp or RFC3339." },
    {
      key: "fromType",
      label: "Message type",
      type: "select",
      options: [
        { value: 1, label: "Transactional" },
        { value: 2, label: "Marketing" },
        { value: 3, label: "Unknown" },
      ],
    },
    {
      key: "messageStatus",
      label: "Message status",
      type: "number",
      hint: "Mailjet's numeric status code — see their Messages reference for the 0-11 table.",
    },
    { key: "senderId", label: "Sender ID", type: "number" },
    {
      key: "showSubject",
      label: "Include subject",
      type: "boolean",
      hint: "Off by default — the response has no `Subject` without this.",
    },
    {
      key: "showCustomId",
      label: "Include custom ID",
      type: "boolean",
      hint: "Off by default.",
    },
    {
      key: "showContactAlt",
      label: "Include recipient address",
      type: "boolean",
      hint: "Off by default — otherwise you get only the opaque `ContactID`.",
    },
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "Data", type: "array", label: "Messages" },
    { key: "Count", type: "number", label: "Count" },
    { key: "Total", type: "number", label: "Total" },
  ],

  execute(input, ctx) {
    const client = new MailjetClient(ctx);
    return client.v3<MailjetEnvelope<MailjetMessageRecord>>("/message", {
      query: {
        ...pageQuery(input),
        Campaign: input.campaign,
        Contact: input.contact,
        CustomID: input.customId,
        FromTS: input.fromTs,
        ToTS: input.toTs,
        FromType: input.fromType,
        MessageStatus: input.messageStatus,
        SenderID: input.senderId,
        ShowSubject: input.showSubject,
        ShowCustomID: input.showCustomId,
        ShowContactAlt: input.showContactAlt,
      },
    });
  },
};

export default listMessages;
