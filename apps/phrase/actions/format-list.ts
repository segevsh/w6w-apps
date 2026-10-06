import type { ActionDefinition } from "@w6w/types";
import { PhraseClient } from "../lib/client.ts";
import { pageOutput, paginationParams } from "../lib/params.ts";

/**
 * `GET /v2/formats` — list the file formats Phrase can import and export, with the `api_name` to use as a file format.
 */
interface Input {
  page?: number;
  perPage?: number;
}

const formatList: ActionDefinition<Input> = {
  key: "format-list",
  type: "search",
  resource: "format",
  title: "List Formats",
  description:
    "List the file formats Phrase can import and export, with the `api_name` to use as a file format.",
  params: [
    ...paginationParams(),
  ],
  output: [...pageOutput],

  execute(input, ctx) {
    return new PhraseClient(ctx).list(`/formats`, { page: input.page, per_page: input.perPage });
  },
};

export default formatList;
