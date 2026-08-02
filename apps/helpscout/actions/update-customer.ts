import type { ActionDefinition } from "@w6w/types";
import { HelpScoutClient } from "../lib/client.ts";

interface Input {
  customerId: number;
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  organizationId?: number;
  background?: string;
}

/**
 * Unlike Update Conversation (one op per call), Help Scout's Update Customer
 * endpoint accepts an ARRAY of `{ op, path, value }` operations in a single
 * request — Help Scout's own "Update multiple fields" example does exactly
 * this. So this action builds one `replace` op per field the caller actually
 * set, letting several fields change in one call while leaving the rest of
 * the record untouched (a param left blank generates no op at all, rather
 * than a `replace` to empty string).
 */
const updateCustomer: ActionDefinition<Input> = {
  key: "update-customer",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description:
    "Change one or more top-level fields on a customer. Fields left blank are untouched.",
  idempotent: true,
  params: [
    { key: "customerId", label: "Customer ID", type: "number", required: true },
    { key: "firstName", label: "First name", type: "string", row: "name" },
    { key: "lastName", label: "Last name", type: "string", row: "name" },
    { key: "jobTitle", label: "Job title", type: "string" },
    { key: "organizationId", label: "Organization ID", type: "number" },
    {
      key: "background",
      label: "Notes",
      type: "text",
      config: { multiline: true },
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Updated" }],

  async execute(input, ctx) {
    const ops: Array<{ op: "replace"; path: string; value: unknown }> = [];
    const set = (path: string, value: unknown) => {
      if (value !== undefined && value !== "") ops.push({ op: "replace", path, value });
    };
    set("/firstName", input.firstName);
    set("/lastName", input.lastName);
    set("/jobTitle", input.jobTitle);
    set("/organizationId", input.organizationId);
    set("/background", input.background);

    if (ops.length === 0) {
      throw new Error("update-customer: set at least one field to change.");
    }

    // Help Scout answers 204 No Content — nothing to hand back beyond confirmation.
    await new HelpScoutClient(ctx).request(`/customers/${input.customerId}`, {
      method: "PATCH",
      body: ops,
    });
    return { success: true };
  },
};

export default updateCustomer;
