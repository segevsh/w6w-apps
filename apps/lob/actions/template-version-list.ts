import type { ActionDefinition } from "@w6w/types";
import { encodeId, LobClient } from "../lib/client.ts";
import { listOutput, type PageInput, pageQuery, paginationParams } from "../lib/params.ts";

interface Input extends PageInput {
  templateId: string;
}

const templateVersionList: ActionDefinition<Input> = {
  key: "template-version-list",
  type: "search",
  resource: "template",
  title: "List Template Versions",
  description: "List the versions of one template with cursor paging.",
  params: [
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      required: true,
      placeholder: "tmpl_…",
    },
    ...paginationParams(10),
  ],
  output: listOutput,

  execute(input, ctx) {
    return new LobClient(ctx).list(
      `/templates/${encodeId(input.templateId)}/versions`,
      pageQuery(input),
      { includeTotal: input.includeTotal },
    );
  },
};

export default templateVersionList;
