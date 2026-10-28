import type { ActionDefinition } from "@w6w/types";
import { seg, SUCCESS, type Success, ZohoCliqClient } from "../lib/client.ts";
import { buildFileForm, type FileInput } from "../lib/files.ts";
import { botUniqueName, fileParams } from "../lib/params.ts";

interface Input extends FileInput {
  channelId?: string;
  channelUniqueName?: string;
  botUniqueName?: string;
}

/**
 * `POST /api/v2/channels/{CHANNEL_ID}/files` or
 * `POST /api/v2/channelsbyname/{CHANNEL_UNIQUE_NAME}/files` — multipart
 * upload, scope `ZohoCliq.Webhooks.CREATE`, `204`. `bot_unique_name` shares
 * the file as a bot that is already a participant (the reference shows it both
 * as a query parameter and as a form field; both are sent).
 */
const fileShareChannel: ActionDefinition<Input, Success> = {
  key: "file-share-channel",
  type: "perform",
  resource: "file",
  title: "Share File in Channel",
  description: "Upload a file into a channel by channel id or unique name, optionally as a bot.",
  idempotent: false,
  params: [
    {
      key: "channelId",
      label: "Channel ID",
      type: "string",
      hint: "Give this or the unique name.",
    },
    { key: "channelUniqueName", label: "Channel unique name", type: "string" },
    ...fileParams,
    { ...botUniqueName, hint: "Share as this bot (it must already be a participant)." },
  ],
  output: [{ key: "success", type: "boolean", label: "Shared" }],

  async execute(input, ctx) {
    const id = input.channelId?.trim();
    const name = input.channelUniqueName?.trim();
    if (!id && !name) throw new Error("Provide a channel id or a channel unique name.");
    const path = id ? `/channels/${seg(id)}/files` : `/channelsbyname/${seg(name!)}/files`;
    await new ZohoCliqClient(ctx).request(path, {
      method: "POST",
      query: { bot_unique_name: input.botUniqueName },
      form: buildFileForm(input, { bot_unique_name: input.botUniqueName }),
    });
    return SUCCESS;
  },
};

export default fileShareChannel;
