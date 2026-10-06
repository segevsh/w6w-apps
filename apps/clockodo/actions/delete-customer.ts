import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, intId } from "../lib/client.ts";

interface Input {
  id: string;
  dryRun?: boolean;
  force?: boolean;
}

const deleteCustomer: ActionDefinition<Input> = {
  key: "delete-customer",
  type: "perform",
  resource: "customer",
  title: "Delete Customer",
  description:
    "Delete a customer (DELETE /v3/customers/{id}). Use `dryRun` to see whether it would be allowed, and `force` to also delete dependent time entries. Irreversible without `dryRun`.",
  params: [
    {
      key: "id",
      label: "Customer ID",
      type: "string",
      required: true,
    },
    {
      key: "dryRun",
      label: "Dry run",
      type: "boolean",
      hint: "Check only; nothing is deleted.",
    },
    {
      key: "force",
      label: "Force",
      type: "boolean",
      hint: "Also delete dependent data.",
    },
  ],
  output: [
    {
      key: "success",
      type: "boolean",
      label: "True when deleted (or when a dry run would succeed)",
    },
  ],
  idempotent: true,

  async execute(input, ctx) {
    const id = intId(input.id, "id");
    const body = await new ClockodoClient(ctx).call(`/v3/customers/${id}`, {
      method: "DELETE",
      query: { dry_run: input.dryRun, force: input.force },
    });
    return { success: body.success === true };
  },
};

export default deleteCustomer;
