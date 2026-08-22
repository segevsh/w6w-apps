import type { ActionDefinition } from "@w6w/types";
import { VantaClient } from "../lib/client.ts";

/**
 * `GET /v1/vendors/{vendorId}` — one supplier, with the assessment behind it.
 *
 * The fields worth the call are the ones that answer whether the vendor has
 * actually been assessed rather than merely recorded: the risk level assigned,
 * the last security review, and the data the vendor handles.
 *
 * That last one is what turns an inventory into a risk picture. A vendor with
 * no access to customer data and a vendor processing everything are the same
 * row in a list and completely different obligations.
 */
const action: ActionDefinition = {
  key: "vendor-get",
  type: "read",
  resource: "vendor",
  title: "Get a vendor",
  description:
    "One supplier with its risk level, last review and the data it handles — which is what " +
    "separates an inventory from a risk picture.",
  params: [
    { key: "vendorId", label: "Vendor ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Vendor ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "inherentRiskLevel", type: "string", label: "Assessed risk" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const vendorId = String(p.vendorId ?? "").trim();
    if (!vendorId) throw new Error("`vendorId` is required");
    return await new VantaClient(ctx).request(`/vendors/${encodeURIComponent(vendorId)}`);
  },
};

export default action;
