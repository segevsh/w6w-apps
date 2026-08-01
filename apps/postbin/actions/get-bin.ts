import type { ActionDefinition } from "@w6w/types";
import { type Bin, postbinRequest } from "../lib/client.ts";

interface Input {
  binId: string;
}

/** GET /api/bin/:binId — look up a bin's creation/expiry time. 404s once it has expired. */
const getBin: ActionDefinition<Input, Bin> = {
  key: "get-bin",
  type: "read",
  resource: "bin",
  title: "Get Bin",
  description: "Look up a bin's creation and expiry time by its ID.",
  params: [
    {
      key: "binId",
      label: "Bin ID",
      type: "string",
      required: true,
      hint: "The opaque binId returned by Create Bin.",
    },
  ],
  output: [
    { key: "binId", type: "string", label: "Bin ID" },
    { key: "now", type: "number", label: "Created at (ms epoch)" },
    { key: "expires", type: "number", label: "Expires at (ms epoch)" },
  ],

  async execute(input, ctx) {
    return await postbinRequest<Bin>(ctx, `/api/bin/${encodeURIComponent(input.binId)}`);
  },
};

export default getBin;
