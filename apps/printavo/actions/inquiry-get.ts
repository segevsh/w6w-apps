import type { ActionDefinition } from "@w6w/types";
import { PrintavoClient } from "../lib/client.ts";
import { INQUIRY_FIELDS } from "../lib/fields.ts";

interface Input {
  id: string;
}

const inquiryGet: ActionDefinition<Input> = {
  key: "inquiry-get",
  type: "read",
  resource: "inquiry",
  title: "Get Inquiry",
  description: "Fetch one inquiry by ID.",
  params: [
    { key: "id", label: "Inquiry ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
  ],

  async execute(input, ctx) {
    const client = new PrintavoClient(ctx);
    const data = await client.query<Record<string, unknown>>(
      `query($id: ID!) { inquiry(id: $id) { ${INQUIRY_FIELDS} } }`,
      { id: input.id },
    );
    return data.inquiry;
  },
};

export default inquiryGet;
