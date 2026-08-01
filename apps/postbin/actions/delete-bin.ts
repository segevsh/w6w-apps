import type { ActionDefinition } from "@w6w/types";
import { postbinRequest } from "../lib/client.ts";

interface Input {
  binId: string;
}

interface Output {
  msg: string;
}

/**
 * DELETE /api/bin/:binId — deletes a bin and everything collected in it.
 * Idempotent per PostBin's own docs: deleting a binId that doesn't exist (or
 * already expired) still answers 200.
 */
const deleteBin: ActionDefinition<Input, Output> = {
  key: "delete-bin",
  type: "perform",
  resource: "bin",
  title: "Delete Bin",
  description:
    "Delete a bin and everything collected in it. Succeeds even if the bin is already gone.",
  idempotent: true,
  params: [
    { key: "binId", label: "Bin ID", type: "string", required: true },
  ],
  output: [{ key: "msg", type: "string", label: "Result message" }],

  execute(input, ctx) {
    return postbinRequest<Output>(ctx, `/api/bin/${encodeURIComponent(input.binId)}`, {
      method: "DELETE",
    });
  },
};

export default deleteBin;
