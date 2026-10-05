import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, seg } from "../lib/client.ts";

interface Input {
  igUserId: string;
  fields?: string;
}

const DEFAULT_FIELDS =
  "id,username,name,biography,website,followers_count,follows_count,media_count,profile_picture_url";

/**
 * Get an Instagram Business or Creator account — `GET /{ig-user-id}`. The
 * reference lists `biography`, `followers_count`, `follows_count`, `media_count`,
 * `name`, `profile_picture_url`, `username`, `website` among the fields.
 */
const getAccount: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-account",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Get the profile and counts of an Instagram professional account.",
  params: [
    {
      key: "igUserId",
      label: "Instagram Account ID",
      type: "string",
      required: true,
      hint: "From “List Instagram Accounts” (`instagram_business_account.id`).",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: DEFAULT_FIELDS,
      hint: "Comma-separated IG User fields.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Account ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "followers_count", type: "number", label: "Followers" },
    { key: "media_count", type: "number", label: "Media count" },
  ],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<Record<string, unknown>>(`/${seg(input.igUserId)}`, {
      params: { fields: input.fields || DEFAULT_FIELDS },
    });
  },
};

export default getAccount;
