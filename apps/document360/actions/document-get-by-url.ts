import type { ActionDefinition } from "@w6w/types";
import { Document360Client } from "../lib/client.ts";
import { projectIdParam } from "../lib/params.ts";

/** Look up an article or category by its relative URL path (for example /getting-started). */
interface Input {
  projectId?: string;
  url: string;
  isForDisplay?: boolean;
  isPublished?: boolean;
}

const documentGetByUrl: ActionDefinition<Input> = {
  key: "document-get-by-url",
  type: "read",
  resource: "workspace",
  title: "Get Document by URL",
  description:
    "Look up an article or category by its relative URL path (for example /getting-started).",
  params: [projectIdParam, {
    key: "url",
    label: "URL path",
    type: "string",
    required: true,
    placeholder: "/getting-started",
  }, {
    key: "isForDisplay",
    label: "Rendered content",
    type: "boolean",
    default: true,
    hint: "True returns display-ready HTML; false returns raw content.",
  }, {
    key: "isPublished",
    label: "Published version only",
    type: "boolean",
    default: true,
    hint: "False returns the latest draft.",
  }],
  output: [{ key: "id", type: "string", label: "Document ID" }, {
    key: "title",
    type: "string",
    label: "Title",
  }],

  async execute(input, ctx) {
    const c = new Document360Client(ctx);
    return await c.data("GET", c.projectPath(input.projectId, "/document"), {
      query: {
        url: input.url,
        is_for_display: input.isForDisplay,
        is_published: input.isPublished,
      },
    });
  },
};

export default documentGetByUrl;
