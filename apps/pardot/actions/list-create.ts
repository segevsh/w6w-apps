import type { ActionDefinition } from "@w6w/types";
import { PardotClient, unset } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

interface Input {
  name: string;
  title?: string;
  description?: string;
  isPublic?: boolean;
  campaignId?: number;
  folderId?: number;
  fields?: string;
}

const DEFAULT_FIELDS = "id,name,title,description,isPublic,campaignId,folderId,createdAt";

const listCreate: ActionDefinition<Input> = {
  key: "list-create",
  type: "perform",
  resource: "list",
  title: "Create List",
  description: "Create a static list. Add prospects to it with Add Prospect to List.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "title",
      label: "Public title",
      type: "string",
      hint: "Shown to prospects on public lists.",
    },
    { key: "description", label: "Description", type: "string" },
    { key: "isPublic", label: "Public", type: "boolean" },
    { key: "campaignId", label: "Campaign ID", type: "number" },
    {
      key: "folderId",
      label: "Folder ID",
      type: "number",
      hint: "Defaults to the uncategorized folder.",
    },
    fieldsParam(DEFAULT_FIELDS),
  ],
  output: [
    { key: "id", type: "number", label: "List ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const body: Record<string, unknown> = { name: input.name };
    for (const k of ["title", "description", "isPublic", "campaignId", "folderId"] as const) {
      const v = unset(input[k]);
      if (v !== undefined) body[k] = v;
    }
    const created = await new PardotClient(ctx).request("/lists", {
      method: "POST",
      query: { fields: unset(input.fields) ?? DEFAULT_FIELDS },
      body,
    });
    return created ?? { created: true };
  },
};

export default listCreate;
