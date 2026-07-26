import type { ActionDefinition } from "@w6w/types";
import { TrelloClient, unset } from "../lib/client.ts";

interface Input {
  cardId: string;
  url: string;
  name?: string;
  setCover?: boolean;
}

/**
 * URL attachments only. Trello also accepts a multipart file upload, which
 * would mean streaming bytes out of the action sandbox — not something
 * `ctx.fetch` is for.
 */
const cardAddAttachment: ActionDefinition<Input> = {
  key: "card-add-attachment",
  type: "perform",
  resource: "card",
  title: "Add Attachment to Card",
  description: "Attach a URL to a card.",
  idempotent: false,
  params: [
    { key: "cardId", label: "Card ID", type: "string", required: true },
    {
      key: "url",
      label: "URL",
      type: "string",
      required: true,
      hint: "Must be a http(s) URL Trello can reach.",
    },
    { key: "name", label: "Name", type: "string", hint: "Display name for the attachment." },
    { key: "setCover", label: "Set as cover", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "Attachment ID" },
    { key: "url", type: "string", label: "URL" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new TrelloClient(ctx).request(
      `/cards/${encodeURIComponent(input.cardId)}/attachments`,
      {
        method: "POST",
        query: { url: input.url, name: unset(input.name), setCover: input.setCover },
      },
    );
  },
};

export default cardAddAttachment;
