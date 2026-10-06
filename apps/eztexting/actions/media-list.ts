import type { ActionDefinition } from "@w6w/types";
import { EzTextingClient } from "../lib/client.ts";
import { pageOutput, paginationParams, sortParam } from "../lib/params.ts";

/** `GET /v1/media-files` — media files previously uploaded for MMS. */
interface Input {
  page?: number;
  size?: string;
  sort?: string;
}

const mediaList: ActionDefinition<Input> = {
  key: "media-list",
  type: "search",
  resource: "media",
  title: "List Media Files",
  description: "List the media files uploaded to the account (used for MMS).",
  params: [...paginationParams(), sortParam("uploadAt,desc")],
  output: pageOutput("Media files"),

  execute(input, ctx) {
    return new EzTextingClient(ctx).page("/media-files", {
      query: { page: input.page, size: input.size, sort: input.sort },
    });
  },
};

export default mediaList;
