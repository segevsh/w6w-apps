import type { ActionDefinition } from "@w6w/types";
import { PrintNodeClient, toSet } from "../lib/client.ts";

/**
 * `DELETE /printjobs/{PRINT JOB SET}` — cancel jobs not yet delivered to the
 * PrintNode Client. Jobs already delivered or completed cannot be cancelled and
 * are simply absent from the returned id list (the call still answers 200).
 *
 * The bare `DELETE /printjobs` (cancel everything) is never built here.
 */
interface Input {
  printJobIds: string | number;
}

const printjobCancel: ActionDefinition<Input> = {
  key: "printjob-cancel",
  type: "perform",
  resource: "printjob",
  title: "Cancel Print Jobs",
  description: "Cancel print jobs that have not yet reached the PrintNode Client.",
  idempotent: true,
  params: [
    {
      key: "printJobIds",
      label: "Print job ID(s)",
      type: "string",
      required: true,
      hint: "A positive integer, or a comma-separated set such as `623,624`.",
    },
  ],
  output: [{ key: "cancelled", type: "array", label: "Print job ids actually cancelled" }],
  async execute(input, ctx) {
    const set = toSet(input.printJobIds, "Print job ID(s)");
    const cancelled = await new PrintNodeClient(ctx).json<number[]>(`/printjobs/${set}`, {
      method: "DELETE",
    });
    return { cancelled };
  },
};

export default printjobCancel;
