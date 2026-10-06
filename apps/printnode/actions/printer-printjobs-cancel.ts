import type { ActionDefinition } from "@w6w/types";
import { PrintNodeClient, toOptionalSet, toSet } from "../lib/client.ts";

/**
 * `DELETE /printers/{PRINTER SET}/printjobs` — cancel every undelivered job on
 * the given printers, or `.../printjobs/{PRINT JOB SET}` to narrow to given
 * jobs. Already-delivered jobs are skipped by the vendor.
 */
interface Input {
  printerIds: string | number;
  printJobIds?: string | number;
}

const printerPrintjobsCancel: ActionDefinition<Input> = {
  key: "printer-printjobs-cancel",
  type: "perform",
  resource: "printjob",
  title: "Cancel Print Jobs On Printers",
  description: "Cancel all undelivered print jobs on given printers, or only the listed jobs.",
  idempotent: true,
  params: [
    {
      key: "printerIds",
      label: "Printer ID(s)",
      type: "string",
      required: true,
      hint: "A positive integer, or a comma-separated set such as `34,36`.",
    },
    {
      key: "printJobIds",
      label: "Print job ID(s)",
      type: "string",
      hint: "Optional. Leave empty to cancel EVERY undelivered job on those printers.",
    },
  ],
  output: [{ key: "cancelled", type: "array", label: "Print job ids actually cancelled" }],
  async execute(input, ctx) {
    const printers = toSet(input.printerIds, "Printer ID(s)");
    const jobs = toOptionalSet(input.printJobIds, "Print job ID(s)");
    const path = jobs
      ? `/printers/${printers}/printjobs/${jobs}`
      : `/printers/${printers}/printjobs`;
    const cancelled = await new PrintNodeClient(ctx).json<number[]>(path, { method: "DELETE" });
    return { cancelled };
  },
};

export default printerPrintjobsCancel;
