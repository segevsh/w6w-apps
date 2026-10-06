import type { ActionDefinition } from "@w6w/types";
import { PrintNodeClient, toSet } from "../lib/client.ts";

/**
 * `DELETE /computers/{COMPUTER SET}` — remove computers from the account.
 *
 * The vendor also documents `DELETE /computers` with no set, which removes
 * EVERY computer. This action deliberately requires ids and never builds that
 * form. Answers an array of the ids that were affected.
 */
interface Input {
  computerIds: string | number;
}

const computerDelete: ActionDefinition<Input> = {
  key: "computer-delete",
  type: "perform",
  resource: "computer",
  title: "Delete Computers",
  description: "Remove one or more computers from the account. Returns the ids removed.",
  idempotent: true,
  params: [
    {
      key: "computerIds",
      label: "Computer ID(s)",
      type: "string",
      required: true,
      hint: "A positive integer, or a comma-separated set such as `1,3,5`.",
    },
  ],
  output: [{ key: "deleted", type: "array", label: "Computer ids affected" }],
  async execute(input, ctx) {
    const set = toSet(input.computerIds, "Computer ID(s)");
    const deleted = await new PrintNodeClient(ctx).json<number[]>(`/computers/${set}`, {
      method: "DELETE",
    });
    return { deleted };
  },
};

export default computerDelete;
