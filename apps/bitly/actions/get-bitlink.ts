import type { ActionDefinition } from "@w6w/types";
import { type Bitlink, BitlyClient } from "../lib/client.ts";

interface Input {
  bitlink: string;
}

/** GET /bitlinks/{bitlink} — `bitlink` is `domain/hash`, e.g. `bit.ly/abc123`. */
const getBitlink: ActionDefinition<Input, Bitlink> = {
  key: "get-bitlink",
  type: "read",
  resource: "bitlink",
  title: "Get Bitlink",
  description: "Retrieve a single Bitlink's details.",
  params: [
    {
      key: "bitlink",
      label: "Bitlink",
      type: "string",
      required: true,
      placeholder: "bit.ly/abc123",
      hint: "domain/hash, without the https:// scheme.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Bitlink ID" },
    { key: "link", type: "string", label: "Short link" },
    { key: "long_url", type: "string", label: "Long URL" },
    { key: "title", type: "string", label: "Title" },
    { key: "archived", type: "boolean", label: "Archived" },
  ],

  execute(input, ctx) {
    const client = new BitlyClient(ctx);
    return client.request<Bitlink>(`/bitlinks/${input.bitlink}`);
  },
};

export default getBitlink;
