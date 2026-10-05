import type { ActionDefinition } from "@w6w/types";
import { DrataClient, toList } from "../lib/client.ts";
import { deviceSourceTypes, expandParam, opts, pageParams } from "../lib/params.ts";

/**
 * `GET /devices` — List devices (managed laptops and workstations) with their compliance posture.
 *
 * Cursor-paginated: pass the result's `nextCursor` back as `cursor` until it is `null`.
 */
interface Input {
  sourceType?: string;
  serialNumber?: string;
  macAddress?: string;
  personnelId?: number;
  externalId?: string;
  expand?: string[] | string;
  cursor?: string;
  size?: number;
  includeTotalCount?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "device-list",
  type: "search",
  resource: "device",
  title: "List Devices",
  description: "List devices (managed laptops and workstations) with their compliance posture.",
  params: [
    { key: "sourceType", label: "Source", type: "select", options: opts(deviceSourceTypes) },
    { key: "serialNumber", label: "Serial number", type: "string" },
    { key: "macAddress", label: "MAC address", type: "string" },
    { key: "personnelId", label: "Personnel ID", type: "number" },
    { key: "externalId", label: "External ID", type: "string" },
    expandParam(["asset", "complianceChecks", "documents", "identifiers"]),
    ...pageParams,
  ],
  output: [
    { key: "items", type: "array", label: "Devices" },
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
    return new DrataClient(ctx).list(`/devices`, {
      "sourceType": input.sourceType,
      "serialNumber": input.serialNumber,
      "macAddress": input.macAddress,
      "personnelId": input.personnelId,
      "externalId": input.externalId,
      "expand[]": toList(input.expand),
      cursor: input.cursor,
      size: input.size,
      includeTotalCount: input.includeTotalCount || undefined,
    });
  },
};

export default action;
