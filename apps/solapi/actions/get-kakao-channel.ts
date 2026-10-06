import type { ActionDefinition } from "@w6w/types";
import { encodeId, obj, SolapiClient } from "../lib/client.ts";

/**
 * Get Kakao Channel — Get one linked Kakao channel: handle, phone number, brand flag and shared accounts.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
interface Input {
  channelId: string;
}

const getKakaoChannel: ActionDefinition<Input> = {
  key: "get-kakao-channel",
  type: "read",
  resource: "kakao",
  title: "Get Kakao Channel",
  description:
    "Get one linked Kakao channel: handle, phone number, brand flag and shared accounts.",
  params: [
    {
      "key": "channelId",
      "label": "Channel ID",
      "type": "string",
      "required": true,
      "hint": "From List Kakao Channels.",
    },
  ],
  output: [
    {
      "key": "channel",
      "type": "object",
      "label": "The channel object",
    },
  ],

  async execute(input, ctx) {
    return {
      channel: obj(
        await new SolapiClient(ctx).json(`/kakao/v2/channels/${encodeId(input.channelId)}`),
      ),
    };
  },
};

export default getKakaoChannel;
