import type { ActionDefinition } from "@w6w/types";
import { DrataClient, toList } from "../lib/client.ts";
import {
  expandParam,
  impactLevels,
  opts,
  pageParams,
  vendorCategories,
  vendorRisks,
  vendorStatuses,
  vendorTypes,
} from "../lib/params.ts";

/**
 * `GET /vendors` — List vendors, filtered by status, risk, category or type.
 *
 * Cursor-paginated: pass the result's `nextCursor` back as `cursor` until it is `null`.
 */
interface Input {
  statuses?: string[] | string;
  categories?: string[] | string;
  types?: string[] | string;
  risk?: string;
  impactLevel?: string;
  isSubProcessor?: string;
  actionRequired?: string;
  expand?: string[] | string;
  cursor?: string;
  size?: number;
  includeTotalCount?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "vendor-list",
  type: "search",
  resource: "vendor",
  title: "List Vendors",
  description: "List vendors, filtered by status, risk, category or type.",
  params: [
    { key: "statuses", label: "Status", type: "multiselect", options: opts(vendorStatuses) },
    { key: "categories", label: "Category", type: "multiselect", options: opts(vendorCategories) },
    { key: "types", label: "Type", type: "multiselect", options: opts(vendorTypes) },
    { key: "risk", label: "Risk", type: "select", options: opts(vendorRisks) },
    { key: "impactLevel", label: "Impact level", type: "select", options: opts(impactLevels) },
    {
      key: "isSubProcessor",
      label: "Is sub-processor",
      type: "select",
      options: opts(["true", "false"]),
    },
    {
      key: "actionRequired",
      label: "Action required",
      type: "select",
      options: opts(["true", "false"]),
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
    ...pageParams,
  ],
  output: [
    { key: "items", type: "array", label: "Vendors" },
    {
      key: "nextCursor",
      type: "string",
      label: "Cursor for the next page (null on the last page)",
    },
    {
      key: "totalCount",
      type: "number",
      label: "Total matching records (only with Include total count, first page)",
    },
  ],

  execute(input, ctx) {
    return new DrataClient(ctx).list(`/vendors`, {
      "statuses[]": toList(input.statuses),
      "categories[]": toList(input.categories),
      "types[]": toList(input.types),
      "risk": input.risk,
      "impactLevel": input.impactLevel,
      "isSubProcessor": input.isSubProcessor,
      "actionRequired": input.actionRequired,
      "expand[]": toList(input.expand),
      cursor: input.cursor,
      size: input.size,
      includeTotalCount: input.includeTotalCount || undefined,
    });
  },
};

export default action;
