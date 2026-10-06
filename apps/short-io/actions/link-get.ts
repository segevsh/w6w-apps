import type { ActionDefinition } from "@w6w/types";
import { LINK_OUTPUT, ShortClient, type ShortLink, stripPassword } from "../lib/client.ts";

interface Input {
  linkId: string;
}

/** GET /links/{linkId} */
const linkGet: ActionDefinition<Input, ShortLink> = {
  key: "link-get",
  type: "read",
  resource: "link",
  title: "Get Link",
  description: "Fetch one link by its id.",
  params: [
    {
      key: "linkId",
      label: "Link ID",
      type: "string",
      required: true,
      placeholder: "lnk_abc123_def456",
    },
  ],
  output: LINK_OUTPUT,

  async execute(input, ctx) {
    const link = await new ShortClient(ctx).request<ShortLink>(
      `/links/${encodeURIComponent(input.linkId)}`,
    );
    return stripPassword(link);
  },
};

export default linkGet;
