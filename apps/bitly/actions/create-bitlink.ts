import type { ActionDefinition } from "@w6w/types";
import { type Bitlink, BitlyClient } from "../lib/client.ts";

interface Input {
  longUrl: string;
  domain?: string;
  groupGuid?: string;
  title?: string;
  tags?: string[];
}

/**
 * POST /bitlinks
 *
 * Shortens `longUrl` into a Bitlink. `domain` defaults to `bit.ly` on Bitly's
 * side when omitted; `groupGuid` files it under a specific group instead of
 * the account default. Not marked idempotent: whether re-POSTing the same
 * `long_url` returns the existing Bitlink or mints a new one isn't documented
 * clearly enough to assert either way, so this is treated conservatively as a
 * plain create.
 */
const createBitlink: ActionDefinition<Input, Bitlink> = {
  key: "create-bitlink",
  type: "perform",
  resource: "bitlink",
  title: "Create Bitlink",
  description: "Shorten a long URL into a Bitlink.",
  idempotent: false,
  params: [
    {
      key: "longUrl",
      label: "Long URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/a/very/long/path",
    },
    {
      key: "domain",
      label: "Domain",
      type: "string",
      default: "bit.ly",
      hint: "A branded short domain on the account, or bit.ly.",
    },
    {
      key: "groupGuid",
      label: "Group GUID",
      type: "string",
      hint: "File the new Bitlink under this group instead of the account default.",
    },
    { key: "title", label: "Title", type: "string" },
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
  ],

  execute(input, ctx) {
    const client = new BitlyClient(ctx);
    return client.request<Bitlink>("/bitlinks", {
      method: "POST",
      body: {
        long_url: input.longUrl,
        domain: input.domain,
        group_guid: input.groupGuid,
        title: input.title,
        tags: input.tags,
      },
    });
  },
};

export default createBitlink;
