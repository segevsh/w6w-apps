import type { ActionDefinition } from "@w6w/types";
import { CertifierClient, encodeId } from "../lib/client.ts";
import { designIdParam } from "../lib/params.ts";

interface Input {
  designId: string;
}

const designGet: ActionDefinition<Input> = {
  key: "design-get",
  type: "read",
  resource: "design",
  title: "Get Design",
  description: "Fetch one certificate or badge design: name, type and preview URL.",
  params: [designIdParam],
  output: [
    { key: "id", type: "string", label: "Design ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Type (certificate or badge)" },
    { key: "previewUrl", type: "string", label: "PNG preview URL" },
  ],

  execute(input, ctx) {
    return new CertifierClient(ctx).json(`/designs/${encodeId(input.designId)}`);
  },
};

export default designGet;
