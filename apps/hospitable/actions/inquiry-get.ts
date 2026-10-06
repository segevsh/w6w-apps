import type { ActionDefinition } from "@w6w/types";
import { encodeId, HospitableClient } from "../lib/client.ts";
import { includeParam, ONE_OUTPUT } from "../lib/params.ts";

/** `GET /v2/inquiries/{uuid}` — One inquiry, addressed by its conversation id. */
interface Input {
  uuid: string;
  include?: string;
}

const inquiryGet: ActionDefinition<Input> = {
  key: "inquiry-get",
  type: "read",
  resource: "inquiry",
  title: "Get Inquiry",
  description: "Get an inquiry by its conversation UUID, optionally with its messages.",
  params: [
    { key: "uuid", label: "Conversation UUID", type: "string", required: true },
    includeParam(
      "guest, user, financials, listings, properties, messages",
      "`messages` needs the message:read scope.",
    ),
  ],
  output: ONE_OUTPUT,

  execute(input, ctx) {
    return new HospitableClient(ctx).request("GET", `/inquiries/${encodeId(input.uuid)}`, {
      query: { include: input.include },
    });
  },
};

export default inquiryGet;
