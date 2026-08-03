import type { ActionDefinition } from "@w6w/types";
import { PandaDocClient } from "../lib/client.ts";
import { paging, type PagingInput, resultsOutput } from "../lib/params.ts";

interface Input extends PagingInput {
  q?: string;
  id?: string;
  folderUuid?: string;
  tag?: string;
  shared?: boolean;
  deleted?: boolean;
  fields?: string;
}

/**
 * `GET /public/v1/templates` — the templates a document can be created from.
 *
 * The `id` values this returns are what `document-create-from-template` takes
 * as `templateUuid`.
 *
 * PandaDoc answers `400` when any parameter is present but empty, which is why
 * the client drops empty strings rather than sending them.
 */
const templateGetMany: ActionDefinition<Input> = {
  key: "template-get-many",
  type: "search",
  resource: "template",
  title: "Get Many Templates",
  description: "List the workspace's templates. Their ids are what Create Document takes.",
  params: [
    { key: "q", label: "Search", type: "string", hint: "Search by template name." },
    { key: "id", label: "Template ID", type: "string", hint: "Look up one specific template." },
    { key: "folderUuid", label: "Folder UUID", type: "string", hint: "Sent as `folder_uuid`." },
    { key: "tag", label: "Tag", type: "string" },
    { key: "shared", label: "Shared only", type: "boolean" },
    { key: "deleted", label: "Deleted only", type: "boolean" },
    {
      key: "fields",
      label: "Extra fields",
      type: "string",
      hint: "Comma-separated extra fields to include, e.g. `content_date_modified`.",
    },
    ...paging,
  ],
  output: resultsOutput,

  async execute(input, ctx) {
    return await new PandaDocClient(ctx).request("/templates", {
      query: {
        q: input.q,
        id: input.id,
        folder_uuid: input.folderUuid,
        tag: input.tag,
        shared: input.shared,
        deleted: input.deleted,
        fields: input.fields,
        count: input.count,
        page: input.page,
      },
    });
  },
};

export default templateGetMany;
