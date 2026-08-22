import type { ActionDefinition } from "@w6w/types";
import { GoogleAnalyticsClient, resolveProperty } from "../lib/client.ts";
import { PROPERTY_PARAM } from "../lib/params.ts";

/**
 * `GET /v1beta/properties/{property}/dataStreams/{id}` — verified against
 * Google's Admin API discovery document
 * (`analyticsadmin.properties.dataStreams.get`).
 */
const action: ActionDefinition = {
  key: "data-stream-get",
  type: "read",
  resource: "dataStream",
  title: "Get a data stream",
  description: "Retrieve one data stream, including its measurement ID.",
  params: [
    PROPERTY_PARAM,
    {
      key: "dataStreamId",
      label: "Data Stream ID",
      type: "string",
      required: true,
      default: "",
      hint: "The numeric id from List data streams.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Resource name" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "type", type: "string", label: "Stream type" },
    { key: "webStreamData", type: "object", label: "Web stream data (measurement ID)" },
    { key: "androidAppStreamData", type: "object", label: "Android stream data" },
    { key: "iosAppStreamData", type: "object", label: "iOS stream data" },
    { key: "createTime", type: "string", label: "Created at" },
    { key: "updateTime", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const property = resolveProperty(ctx.connection, p.propertyId);
    const streamId = String(p.dataStreamId ?? "").trim();
    if (!streamId) throw new Error("`dataStreamId` is required");

    ctx.log("info", "getting GA4 data stream", { property, streamId });

    return await new GoogleAnalyticsClient(ctx).admin(
      `/properties/${encodeURIComponent(property)}/dataStreams/${encodeURIComponent(streamId)}`,
    );
  },
};

export default action;
