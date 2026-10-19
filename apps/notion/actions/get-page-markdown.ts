import type { ActionDefinition } from "@w6w/types";
import { NotionClient, pathId } from "../lib/client.ts";

interface Input {
  pageId: string;
  includeTranscript?: boolean;
  markdownVersion?: "v1" | "v2";
}

/** GET /v1/pages/{page_id}/markdown — retrieve-page-markdown. */
const action: ActionDefinition<Input> = {
  key: "get-page-markdown",
  type: "read",
  resource: "page",
  title: "Get Page Markdown",
  description: "Retrieve a page as markdown.",
  output: [
    { "key": "object", "type": "string", "label": "Object" },
    { "key": "id", "type": "string", "label": "Id" },
    { "key": "markdown", "type": "string", "label": "Markdown" },
    { "key": "truncated", "type": "boolean", "label": "Truncated" },
    { "key": "unknown_block_ids", "type": "array", "label": "Unknown block ids" },
    { "key": "warnings", "type": "array", "label": "Warnings" },
  ],
  params: [{
    "key": "pageId",
    "label": "Page ID",
    "type": "string",
    "required": true,
    "hint":
      "The ID of the page (or block) to retrieve as markdown. Non-navigable block IDs from truncated responses can be passed here to fetch their subtrees.",
  }, {
    "key": "includeTranscript",
    "label": "Include Transcript",
    "type": "boolean",
    "hint":
      "Whether to include meeting note transcripts. Defaults to false. When true, full transcripts are included; when false, a placeholder with the meeting note URL is shown instead.",
  }, {
    "key": "markdownVersion",
    "label": "Markdown Version",
    "type": "select",
    "options": [{ "value": "v1", "label": "v1" }, { "value": "v2", "label": "v2" }],
    "hint":
      "The Markdown syntax to use. `v1` (the default) is enhanced markdown. `v2` is [Notion-flavored Markdown](/guides/data-apis/notion-flavored-markdown), an opt-in preview.",
  }],

  execute(input, ctx) {
    const client = new NotionClient(ctx);
    return client.request(`/pages/${pathId(input.pageId)}/markdown`, {
      method: "GET",
      query: {
        "include_transcript": input.includeTranscript,
        "markdown_version": input.markdownVersion,
      },
    });
  },
};

export default action;
