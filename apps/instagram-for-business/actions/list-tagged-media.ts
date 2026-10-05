import type { ActionDefinition } from "@w6w/types";
import { csv, InstagramClient, type InstagramListResponse, seg } from "../lib/client.ts";

interface Input {
  igUserId: string;
  fields?: string;
  mediaTypes?: string | string[];
  postedAfter?: string;
  postedBefore?: string;
  limit?: number;
  cursor?: string;
}

const DEFAULT_FIELDS = "id,username,caption,media_type,media_url,permalink,timestamp";

/**
 * List media in which the account has been tagged by another user —
 * `GET /{ig-user-id}/tags`. Private media is not returned. The optional filters
 * (`media_type`, `posted_after`, `posted_before`) are applied AFTER each page is
 * selected, so a page can be short or empty while more matches exist further back:
 * keep paginating on the `after` cursor. The edge returns `before`/`after` cursors
 * but no `next`/`previous` URLs.
 */
const listTaggedMedia: ActionDefinition<Input, InstagramListResponse<Record<string, unknown>>> = {
  key: "list-tagged-media",
  type: "read",
  resource: "media",
  title: "List Tagged Media",
  description: "List posts in which the account was tagged by other Instagram users.",
  params: [
    { key: "igUserId", label: "Instagram Account ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: DEFAULT_FIELDS,
      hint: "Comma-separated IG Media fields.",
    },
    {
      key: "mediaTypes",
      label: "Media types",
      type: "string",
      hint: "Comma-separated subset of IMAGE, VIDEO, CAROUSEL_ALBUM.",
    },
    {
      key: "postedAfter",
      label: "Posted after",
      type: "string",
      hint: "ISO 8601 datetime (no offset = UTC); strictly after.",
    },
    {
      key: "postedBefore",
      label: "Posted before",
      type: "string",
      hint: "ISO 8601 datetime (no offset = UTC); strictly before.",
    },
    { key: "limit", label: "Limit", type: "number", default: 25 },
    { key: "cursor", label: "Cursor", type: "string", hint: "`after` cursor for pagination." },
  ],
  output: [
    { key: "data", type: "array", label: "Tagged media" },
    { key: "paging", type: "object", label: "Paging cursors" },
  ],

  execute(input, ctx) {
    return new InstagramClient(ctx).request<InstagramListResponse<Record<string, unknown>>>(
      `/${seg(input.igUserId)}/tags`,
      {
        params: {
          fields: input.fields || DEFAULT_FIELDS,
          media_type: csv(input.mediaTypes),
          posted_after: input.postedAfter,
          posted_before: input.postedBefore,
          limit: input.limit ?? 25,
          after: input.cursor,
        },
      },
    );
  },
};

export default listTaggedMedia;
