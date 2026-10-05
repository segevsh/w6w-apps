import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, type InstagramListResponse, seg } from "../lib/client.ts";

interface Input {
  igUserId: string;
  fields?: string;
}

const DEFAULT_FIELDS = "id,media_type,media_url,permalink,thumbnail_url,timestamp";

/**
 * List an account's currently live stories — `GET /{ig-user-id}/stories`. Stories
 * disappear after 24 hours; live-video stories and re-shared stories are not
 * returned.
 */
const listStories: ActionDefinition<Input, InstagramListResponse<Record<string, unknown>>> = {
  key: "list-stories",
  type: "read",
  resource: "media",
  title: "List Stories",
  description: "List the stories an Instagram account has live right now (last 24 hours).",
  params: [
    { key: "igUserId", label: "Instagram Account ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: DEFAULT_FIELDS,
      hint: "Comma-separated IG Media fields.",
    },
  ],
  output: [{ key: "data", type: "array", label: "Stories" }],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<InstagramListResponse<Record<string, unknown>>>(
      `/${seg(input.igUserId)}/stories`,
      { params: { fields: input.fields || DEFAULT_FIELDS } },
    );
  },
};

export default listStories;
