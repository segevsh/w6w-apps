import type { ActionDefinition } from "@w6w/types";
import { DrataClient, seg, toList } from "../lib/client.ts";
import { expandParam } from "../lib/params.ts";

/**
 * `GET /vendors/{vendorId}` — Read one vendor.
 */
interface Input {
  vendorId: number;
  expand?: string[] | string;
}

const action: ActionDefinition<Input> = {
  key: "vendor-get",
  type: "read",
  resource: "vendor",
  title: "Get Vendor",
  description: "Read one vendor.",
  params: [
    {
      key: "vendorId",
      label: "Vendor ID",
      type: "number",
      required: true,
      hint: "Numeric id from List Vendors.",
    },
    expandParam([
      "customFields",
      "documents",
      "integrations",
      "lastQuestionnaire",
      "latestSecurityReviews",
      "reviews",
      "vendorUser",
      "vendorRelationshipContact",
      "dataAccessedOrProcessed",
      "scheduleConfiguration",
      "customVendorType",
      "inherentRiskLevel",
      "residualRiskLevel",
    ]),
  ],
  output: [
    { key: "id", type: "number", label: "Vendor ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "risk", type: "string", label: "Risk" },
  ],

  execute(input, ctx) {
    return new DrataClient(ctx).get(`/vendors/${seg(input.vendorId)}`, {
      "expand[]": toList(input.expand),
    });
  },
};

export default action;
