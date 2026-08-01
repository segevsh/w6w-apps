import type { ActionDefinition } from "@w6w/types";
import { type Bitlink, BitlyClient } from "../lib/client.ts";

interface Input {
  bitlink: string;
  longUrl?: string;
  title?: string;
  archived?: boolean;
  tags?: string[];
}

/**
 * PATCH /bitlinks/{bitlink}
 *
 * Updates fields on an existing Bitlink; `longUrl` re-points where it
 * redirects. Marked idempotent: re-applying the same field values converges
 * on the same end state.
 */
const updateBitlink: ActionDefinition<Input, Bitlink> = {
  key: "update-bitlink",
  type: "perform",
  resource: "bitlink",
  title: "Update Bitlink",
  description: "Update title, archived state, tags, or the redirect target of a Bitlink.",
  idempotent: true,
  params: [
    {
      key: "bitlink",
      label: "Bitlink",
      type: "string",
      required: true,
      placeholder: "bit.ly/abc123",
      hint: "domain/hash, without the https:// scheme.",
    },
    {
      key: "longUrl",
      label: "Long URL",
      type: "string",
      hint: "Re-point the Bitlink's redirect target.",
    },
    { key: "title", label: "Title", type: "string" },
    { key: "archived", label: "Archived", type: "boolean" },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      item: { type: "string" },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Bitlink ID" },
    { key: "link", type: "string", label: "Short link" },
    { key: "long_url", type: "string", label: "Long URL" },
    { key: "archived", type: "boolean", label: "Archived" },
  ],

  execute(input, ctx) {
    const client = new BitlyClient(ctx);
    return client.request<Bitlink>(`/bitlinks/${input.bitlink}`, {
      method: "PATCH",
      body: {
        long_url: input.longUrl,
        title: input.title,
        archived: input.archived,
        tags: input.tags,
      },
    });
  },
};

export default updateBitlink;
