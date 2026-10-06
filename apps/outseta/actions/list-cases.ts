import type { ActionDefinition } from "@w6w/types";
import {
  OutsetaClient,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  q?: string;
  tagUid?: string;
}

/** `GET /api/v1/support/cases` — List support cases, optionally by search string or tag. */
const listCases: ActionDefinition<Input> = {
  key: "list-cases",
  type: "search",
  resource: "support",
  title: "List Support Cases",
  description: "List support cases, optionally by search string or tag.",
  params: [
    ...PAGE_PARAMS,
    {
      key: "q",
      label: "Search",
      type: "string",
      hint: "Search string.",
    },
    {
      key: "tagUid",
      label: "Tag Uid",
      type: "string",
      hint: "Only cases carrying this tag.",
    },
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/support/cases`, {
      method: "GET",
      query: { ...pageQuery(input), q: input.q, tagUid: input.tagUid },
    });
  },
};

export default listCases;
