import type { ActionDefinition } from "@w6w/types";
import { asStringArray, compact, SimpleTextingClient } from "../lib/client.ts";
import { modeParam } from "../lib/params.ts";

/**
 * `POST /api/campaigns` — "Send a Campaign".
 *
 * Answers `201` with `{id}`. The request is `ImmediatelyCampaignRequest`:
 * `{title, listIds, segmentIds, accountPhone, customFieldsMaxLength,
 * messageTemplate}`, with the message template required and itself requiring
 * `mode` and `text`.
 *
 * ## The vendor's prose example describes fields its schema does not declare
 *
 * The endpoint's description shows a body containing `"listsOrSegments": [...]`
 * and a `title` inside `messageTemplate`. Neither exists in
 * `ImmediatelyCampaignRequest` or `MessageTemplate`: the schema declares
 * `listIds` and `segmentIds` as separate arrays and puts `title` only at the top
 * level. This action sends the **schema's** fields — the schema is what the
 * server validates — and the template is built from flat params rather than
 * passed through as opaque JSON so the required pair cannot go missing.
 *
 * ## Not idempotent: a retry is a second campaign
 *
 * There is no idempotency key on this endpoint, and a campaign is not a message
 * to one person: it is a send to every contact on the named lists and segments,
 * billed per recipient. `idempotent: false` is the honest declaration, and the
 * cost of getting it wrong is the highest in this app.
 *
 * ## Audience membership replaces by default
 *
 * `listIds` and `segmentIds` are the audience, and both accept names as well as
 * IDs ("Lists IDs or names", "Segments IDs or names"). An empty audience is
 * refused here before the request: the schema marks neither array required, but
 * a campaign with no lists and no segments has nobody to send to, so failing
 * early is more useful than a 500 from the vendor.
 */
interface Input {
  title: string;
  messageMode: string;
  messageText: string;
  messageSubject?: string;
  unsubscribeText?: string;
  fallbackText?: string;
  fallbackUnsubscribeText?: string;
  mediaItems?: string[] | string;
  listIds?: string[] | string;
  segmentIds?: string[] | string;
  accountPhone?: string;
  customFieldsMaxLength?: unknown;
}

const campaignSend: ActionDefinition<Input> = {
  key: "campaign-send",
  type: "perform",
  resource: "campaign",
  title: "Send Campaign",
  description: "Create and immediately send a campaign to lists and/or segments.",
  idempotent: false,
  params: [
    {
      key: "title",
      label: "Campaign title",
      type: "string",
      required: true,
      placeholder: "My first campaign",
      validation: { minLength: 1, maxLength: 250 },
      hint: "Required by the schema, 1–250 characters. This is the campaign's name in the " +
        "dashboard and in List Campaigns.",
    },
    {
      key: "messageText",
      label: "Message text",
      type: "text",
      required: true,
      hint: "The campaign body. Merge tags such as %%firstname%% are expanded per contact — use " +
        "Evaluate Message to see what a personalised body costs in credits.",
    },
    {
      ...modeParam,
      key: "messageMode",
      hint:
        "The template's own `mode` field: required by the schema and documented as defaulting " +
        "to Auto.",
    },
    {
      key: "messageSubject",
      label: "MMS subject",
      type: "string",
      hint: "Subject for the MMS form of the campaign.",
    },
    {
      key: "unsubscribeText",
      label: "Unsubscribe text",
      type: "string",
      hint: "Appended to the message text. The vendor's default unsubscribe line is used when " +
        "blank.",
    },
    {
      key: "fallbackText",
      label: "MMS fallback text",
      type: "text",
      hint: "Used when a carrier cannot receive the MMS. Should contain [url=%%fallback_link%%], " +
        "which the vendor replaces with a link to the message.",
    },
    {
      key: "fallbackUnsubscribeText",
      label: "Fallback unsubscribe text",
      type: "string",
      hint: "Appended to the fallback text instead of the standard unsubscribe line.",
    },
    {
      key: "mediaItems",
      label: "Media items",
      type: "array",
      item: { type: "string", placeholder: "507f1f77bcf86cd799439011" },
      hint: "MMS attachments: media item IDs or public URLs, as on Send Message.",
    },
    {
      key: "listIds",
      label: "Lists",
      type: "array",
      item: { type: "string", placeholder: "My First List" },
      hint: "List IDs or names. Combined with Segments as the campaign's audience; at least one " +
        "of the two is needed.",
    },
    {
      key: "segmentIds",
      label: "Segments",
      type: "array",
      item: { type: "string", placeholder: "507f191e810c19729de860ea" },
      hint: "Segment IDs or names.",
    },
    {
      key: "accountPhone",
      label: "Send from",
      type: "string",
      placeholder: "8005551234",
      hint: "A number on your account. Blank uses the primary account number.",
    },
    {
      key: "customFieldsMaxLength",
      label: "Custom field lengths",
      type: "json",
      hint: 'Per-field length overrides for this campaign, e.g. {"firstname": 20}. Defaults come ' +
        "from List Custom Fields.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Campaign ID (hexadecimal)" },
  ],

  execute(input, ctx) {
    const listIds = asStringArray(input.listIds);
    const segmentIds = asStringArray(input.segmentIds);
    if (!listIds?.length && !segmentIds?.length) {
      throw new Error(
        "Add at least one list or segment — a campaign with no audience has nobody " +
          "to send to",
      );
    }

    const mediaItems = asStringArray(input.mediaItems);
    ctx.log("info", "sending a SimpleTexting campaign", {
      lists: listIds?.length ?? 0,
      segments: segmentIds?.length ?? 0,
    });

    return new SimpleTextingClient(ctx).json("/api/campaigns", {
      method: "POST",
      body: compact({
        title: input.title,
        listIds,
        segmentIds,
        accountPhone: input.accountPhone,
        customFieldsMaxLength: input.customFieldsMaxLength,
        messageTemplate: compact({
          mode: input.messageMode,
          text: input.messageText,
          subject: input.messageSubject,
          unsubscribeText: input.unsubscribeText,
          fallbackText: input.fallbackText,
          fallbackUnsubscribeText: input.fallbackUnsubscribeText,
          mediaItems,
        }),
      }),
    });
  },
};

export default campaignSend;
