import type { ActionDefinition } from "@w6w/types";
import { compact, LINK_OUTPUT, ShortClient, type ShortLink, stripPassword } from "../lib/client.ts";

interface Input {
  linkId: string;
  path?: string;
}

/**
 * POST /links/duplicate/{linkId} — copies a link with its targeting rules and
 * settings under a new random path (or `path` if given). Each call mints a new
 * link, so it is not idempotent. Vendor limit: 50/s.
 */
const linkDuplicate: ActionDefinition<Input, ShortLink> = {
  key: "link-duplicate",
  type: "perform",
  resource: "link",
  title: "Duplicate Link",
  description: "Copy an existing link, with its settings, to a new short URL.",
  idempotent: false,
  params: [
    {
      key: "linkId",
      label: "Source link ID",
      type: "string",
      required: true,
      placeholder: "lnk_abc123_def456",
    },
    {
      key: "path",
      label: "New path (slug)",
      type: "string",
      hint: "Leave empty for a random one.",
    },
  ],
  output: LINK_OUTPUT,

  async execute(input, ctx) {
    const link = await new ShortClient(ctx).request<ShortLink>(
      `/links/duplicate/${encodeURIComponent(input.linkId)}`,
      { method: "POST", body: compact({ path: input.path }) },
    );
    return stripPassword(link);
  },
};

export default linkDuplicate;
