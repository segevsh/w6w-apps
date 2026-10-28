import type { ActionDefinition } from "@w6w/types";
import { InstagramClient, type InstagramListResponse } from "../lib/client.ts";

interface Input {
  limit?: number;
  cursor?: string;
}

interface PageWithAccount {
  id: string;
  name?: string;
  instagram_business_account?: {
    id: string;
    username?: string;
    name?: string;
    profile_picture_url?: string;
  };
}

/**
 * List the Facebook Pages the connected user manages, each with the Instagram
 * professional account linked to it (`instagram_business_account`). This is how
 * every other action's `igUserId` is discovered: a Page with no linked Instagram
 * account simply comes back without the field.
 *
 * `GET /me/accounts?fields=id,name,instagram_business_account{...}` — needs
 * `pages_show_list` and `instagram_basic`. With a Page token `/me/accounts` is not
 * available; read the Page itself via `GET /{page-id}?fields=instagram_business_account`
 * (Instagram Platform "Page" reference) instead.
 */
const listInstagramAccounts: ActionDefinition<Input, InstagramListResponse<PageWithAccount>> = {
  key: "list-instagram-accounts",
  type: "read",
  resource: "account",
  title: "List Instagram Accounts",
  description:
    "List the Facebook Pages you manage together with the Instagram professional account linked to each.",
  params: [
    { key: "limit", label: "Limit", type: "number", default: 25 },
    { key: "cursor", label: "Cursor", type: "string", hint: "`after` cursor for pagination." },
  ],
  output: [
    { key: "data", type: "array", label: "Pages with their linked Instagram account" },
    { key: "paging", type: "object", label: "Paging" },
  ],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<InstagramListResponse<PageWithAccount>>(
      "/me/accounts",
      {
        params: {
          fields: "id,name,instagram_business_account{id,username,name,profile_picture_url}",
          limit: input.limit ?? 25,
          after: input.cursor,
        },
      },
    );
  },
};

export default listInstagramAccounts;
