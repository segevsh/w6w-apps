import type { ActionDefinition } from "@w6w/types";
import { DrataClient, toList } from "../lib/client.ts";
import {
  assetClassTypes,
  assetTypes,
  employmentStatuses,
  expandParam,
  opts,
  pageParams,
} from "../lib/params.ts";

/**
 * `GET /assets` — List the asset inventory, filtered by class, type or provider.
 *
 * Cursor-paginated: pass the result's `nextCursor` back as `cursor` until it is `null`.
 */
interface Input {
  assetClassType?: string;
  assetType?: string;
  userId?: number;
  employmentStatus?: string;
  expand?: string[] | string;
  cursor?: string;
  size?: number;
  includeTotalCount?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "asset-list",
  type: "search",
  resource: "asset",
  title: "List Assets",
  description: "List the asset inventory, filtered by class, type or provider.",
  params: [
    { key: "assetClassType", label: "Asset class", type: "select", options: opts(assetClassTypes) },
    { key: "assetType", label: "Asset type", type: "select", options: opts(assetTypes) },
    { key: "userId", label: "Owner user ID", type: "number" },
    {
      key: "employmentStatus",
      label: "Owner employment status",
      type: "select",
      options: opts(employmentStatuses),
    },
    expandParam([
      "device",
      "assetClassTypes",
      "complianceChecks",
      "customFields",
      "identifiers",
      "owner",
    ]),
    ...pageParams,
  ],
  output: [
    { key: "items", type: "array", label: "Assets" },
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
    return new DrataClient(ctx).list(`/assets`, {
      "assetClassType": input.assetClassType,
      "assetType": input.assetType,
      "userId": input.userId,
      "employmentStatus": input.employmentStatus,
      "expand[]": toList(input.expand),
      cursor: input.cursor,
      size: input.size,
      includeTotalCount: input.includeTotalCount || undefined,
    });
  },
};

export default action;
