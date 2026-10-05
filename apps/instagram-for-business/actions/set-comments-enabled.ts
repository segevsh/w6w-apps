import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, seg } from "../lib/client.ts";

interface Input {
  mediaId: string;
  enabled: boolean;
}

/**
 * Turn comments on or off for a post — `POST /{ig-media-id}?comment_enabled=`.
 * Live-video media is not supported. Setting the same state twice is harmless.
 */
const setCommentsEnabled: ActionDefinition<Input, { success: boolean }> = {
  key: "set-comments-enabled",
  type: "perform",
  resource: "media",
  title: "Enable or Disable Comments",
  description: "Turn comments on or off for one of the account's posts.",
  idempotent: true,
  params: [
    { key: "mediaId", label: "Media ID", type: "string", required: true },
    {
      key: "enabled",
      label: "Comments enabled",
      type: "boolean",
      required: true,
      hint: "On to allow comments, off to disable them.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<{ success: boolean }>(`/${seg(input.mediaId)}`, {
      method: "POST",
      params: { comment_enabled: Boolean(input.enabled) },
    });
  },
};

export default setCommentsEnabled;
