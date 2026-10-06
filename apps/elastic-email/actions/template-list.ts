import type { ActionDefinition } from "@w6w/types";
import { compact, ElasticClient, toList } from "../lib/client.ts";
import { pagingParams, wrapList } from "../lib/factory.ts";

type Input = Record<string, unknown>;

/** `GET /v4/templates` — `scopeType` is REQUIRED by the vendor and repeats as a query array. */
const templateList: ActionDefinition<Input> = {
  key: "template-list",
  type: "search",
  resource: "template",
  title: "List Templates",
  description: "List email templates of one or both scopes (Personal, Global).",
  params: [
    {
      key: "scopeType",
      label: "Scope",
      type: "string",
      required: true,
      default: "Personal",
      hint: "Comma-separated: Personal, Global.",
    },
    {
      key: "templateTypes",
      label: "Template types",
      type: "string",
      hint: "Optional comma-separated filter, e.g. RawHTML, DragDropEditor, TemplateEditor.",
    },
    ...pagingParams,
  ],
  output: [
    { key: "items", type: "array", label: "Templates" },
    { key: "count", type: "number", label: "Items on this page" },
  ],
  async execute(input, ctx) {
    const scope = toList(input.scopeType as string | undefined);
    if (!scope) throw new Error("Scope is required (Personal and/or Global)");
    const out = await new ElasticClient(ctx).json("/templates", {
      query: compact({
        scopeType: scope,
        templateTypes: toList(input.templateTypes as string | undefined),
        limit: input.limit,
        offset: input.offset,
      }) as Record<string, string>,
    });
    return wrapList(out);
  },
};

export default templateList;
