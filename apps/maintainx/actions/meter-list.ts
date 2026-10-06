import type { ActionDefinition } from "@w6w/types";
import { MaintainXClient, toIdList, toList } from "../lib/client.ts";
import { expandParam, organizationIdParam, paginationParams } from "../lib/params.ts";

/** `GET /v1/meters` */
interface Input {
  measurementType?: string;
  assets?: string;
  expand?: string;
  limit?: number;
  cursor?: string;
  organizationId?: number;
}

const meterList: ActionDefinition<Input> = {
  key: "meter-list",
  type: "search",
  resource: "meter",
  title: "List Meters",
  description: "List meters, optionally with each meter's last reading.",
  params: [
    {
      key: "measurementType",
      label: "Measurement type",
      type: "select",
      options: ["MANUAL", "IOT_DEVICE", "AUTOMATED_SENSOR"].map((v) => ({ value: v, label: v })),
    },
    { key: "assets", label: "Asset IDs", type: "string", hint: "Comma-separated numeric ids." },
    expandParam(["asset", "location", "last_reading"]),
    ...paginationParams,
    organizationIdParam,
  ],
  output: [
    { key: "meters", type: "array", label: "Meters" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page (null when done)" },
  ],

  async execute(input, ctx) {
    return await new MaintainXClient(ctx).list("/meters", "meters", {
      measurementType: input.measurementType,
      assets: toIdList(input.assets, "assets"),
      expand: toList(input.expand),
      limit: input.limit,
      cursor: input.cursor,
    }, input.organizationId);
  },
};

export default meterList;
