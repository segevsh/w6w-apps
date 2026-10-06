import type { ActionDefinition } from "@w6w/types";
import { LandbotClient } from "../lib/client.ts";

/**
 * List WhatsApp Templates — List the WhatsApp templates available to Send WhatsApp Template. With more than one channel, filter by channel to avoid duplicates.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  channelId?: number;
}

const whatsappTemplateList: ActionDefinition<Input> = {
  key: "whatsapp-template-list",
  type: "search",
  resource: "channel",
  title: "List WhatsApp Templates",
  description:
    "List the WhatsApp templates available to Send WhatsApp Template. With more than one channel, filter by channel to avoid duplicates.",
  params: [
    {
      "key": "channelId",
      "label": "Channel ID",
      "type": "number",
      "hint": "Restrict to one channel (avoids duplicates after a channel migration).",
    },
  ],
  output: [
    { key: "templates", type: "array", label: "Templates (id, params_number, text)" },
  ],

  async execute(input, ctx) {
    const r = await new LandbotClient(ctx).list("/channels/whatsapp/templates/", "templates", {
      query: { channel_id: input.channelId },
    });
    return { templates: r.templates, count: r.count };
  },
};

export default whatsappTemplateList;
