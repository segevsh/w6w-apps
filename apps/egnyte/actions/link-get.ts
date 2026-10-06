import type { ActionDefinition } from "@w6w/types";
import { EgnyteClient } from "../lib/client.ts";

interface Input {
  linkId: string;
}

const linkGet: ActionDefinition<Input> = {
  key: "link-get",
  type: "read",
  resource: "link",
  title: "Get Link",
  description: "Fetch the details of one shareable link by ID.",
  params: [{ key: "linkId", label: "Link ID", type: "string", required: true }],
  output: [
    { key: "path", type: "string", label: "Path" },
    { key: "type", type: "string", label: "Type" },
    { key: "accessibility", type: "string", label: "Accessibility" },
    { key: "links", type: "array", label: "Links" },
  ],

  execute(input, ctx) {
    return new EgnyteClient(ctx).request(`/v1/links/${encodeURIComponent(input.linkId)}`);
  },
};

export default linkGet;
