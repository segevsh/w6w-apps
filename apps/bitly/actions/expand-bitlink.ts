import type { ActionDefinition } from "@w6w/types";
import { BitlyClient } from "../lib/client.ts";

interface Input {
  bitlinkId: string;
}

interface ExpandResult {
  id: string;
  link: string;
  long_url: string;
  created_at?: string;
}

/**
 * POST /expand
 *
 * Resolves a short Bitlink back to its long URL. A lookup with no side
 * effects, so this is `type: "read"` even though Bitly models it as a POST.
 */
const expandBitlink: ActionDefinition<Input, ExpandResult> = {
  key: "expand-bitlink",
  type: "read",
  resource: "bitlink",
  title: "Expand Bitlink",
  description: "Resolve a short Bitlink to its original long URL.",
  params: [
    {
      key: "bitlinkId",
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
  ],

  execute(input, ctx) {
    const client = new BitlyClient(ctx);
    return client.request<ExpandResult>("/expand", {
      method: "POST",
      body: { bitlink_id: input.bitlinkId },
    });
  },
};

export default expandBitlink;
