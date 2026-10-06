import type { ActionDefinition } from "@w6w/types";
import { ShortClient } from "../lib/client.ts";

interface Input {
  domainId: number;
  name: string;
}

/**
 * POST /links/folders with `{domainId, name}` (the two required body fields; the
 * route accepts many optional styling and UTM defaults that are not exposed
 * here). Response schema undocumented; returned untouched.
 */
const folderCreate: ActionDefinition<Input, { result: unknown }> = {
  key: "folder-create",
  type: "perform",
  resource: "folder",
  title: "Create Folder",
  description: "Create a link folder on a domain.",
  idempotent: false,
  params: [
    {
      key: "domainId",
      label: "Domain ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    { key: "name", label: "Folder name", type: "string", required: true },
  ],
  output: [{ key: "result", type: "object", label: "Vendor response (shape not documented)" }],

  async execute(input, ctx) {
    const result = await new ShortClient(ctx).request<unknown>("/links/folders", {
      method: "POST",
      body: { domainId: input.domainId, name: input.name },
    });
    return { result };
  },
};

export default folderCreate;
