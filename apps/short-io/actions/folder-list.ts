import type { ActionDefinition } from "@w6w/types";
import { ShortClient } from "../lib/client.ts";

interface Input {
  domainId: number;
}

/**
 * GET /links/folders/{domainId}. The OpenAPI document declares no response
 * schema for this route (`Default Response` only), so the body is returned
 * untouched under `result` rather than guessing its fields.
 */
const folderList: ActionDefinition<Input, { result: unknown }> = {
  key: "folder-list",
  type: "search",
  resource: "folder",
  title: "List Folders",
  description: "List the link folders on a domain.",
  params: [
    {
      key: "domainId",
      label: "Domain ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
  ],
  output: [{ key: "result", type: "object", label: "Vendor response (shape not documented)" }],

  async execute(input, ctx) {
    const result = await new ShortClient(ctx).request<unknown>(`/links/folders/${input.domainId}`);
    return { result };
  },
};

export default folderList;
