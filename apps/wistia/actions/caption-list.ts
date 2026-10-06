import type { ActionDefinition } from "@w6w/types";
import { encodeId, pageOf, WistiaClient } from "../lib/client.ts";
import { mediaIdParam, pageOutput } from "../lib/params.ts";

interface Input {
  mediaId: string;
}

const captionList: ActionDefinition<Input> = {
  key: "caption-list",
  type: "search",
  resource: "caption",
  title: "List Captions",
  description: "List the caption tracks on one media, one row per language.",
  params: [mediaIdParam],
  output: [...pageOutput],

  async execute(input, ctx) {
    const rows = await new WistiaClient(ctx).json<unknown[]>(
      `/medias/${encodeId(input.mediaId)}/captions`,
    );
    return pageOf(rows);
  },
};

export default captionList;
