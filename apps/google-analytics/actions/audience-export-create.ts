import type { ActionDefinition } from "@w6w/types";
import { compact, csv, GoogleAnalyticsClient, named, resolveProperty } from "../lib/client.ts";
import { DIMENSIONS_PARAM, PROPERTY_PARAM } from "../lib/params.ts";

/**
 * `POST /v1beta/properties/{property}/audienceExports` — verified against
 * Google's Data API discovery document
 * (`analyticsdata.properties.audienceExports.create`).
 *
 * **This starts a long-running job; it does not return the users.** Google
 * answers with an `Operation`, the export takes time to build, and the rows
 * are read afterwards with `audience-export-query`. An action that pretended
 * to return the audience would be lying about the shape of the API, so this
 * one returns the operation and says what to do with it.
 */
const action: ActionDefinition = {
  key: "audience-export-create",
  type: "perform",
  resource: "audienceExport",
  title: "Create an audience export",
  description: "Start an export of an audience's users. Read the rows later with Query.",
  // Each call starts another export job.
  idempotent: false,
  params: [
    PROPERTY_PARAM,
    {
      key: "audience",
      label: "Audience",
      type: "string",
      required: true,
      default: "",
      placeholder: "properties/123456789/audiences/1234567",
      hint: "The audience resource name, from the GA4 UI's audience list.",
    },
    {
      ...DIMENSIONS_PARAM,
      required: true,
      placeholder: "deviceId",
      hint: "Comma-separated dimensions to include per user. `deviceId` is the usual one.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Operation name" },
    { key: "done", type: "boolean", label: "Done" },
    { key: "metadata", type: "object", label: "Operation metadata" },
    { key: "response", type: "object", label: "Response, once done" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const property = resolveProperty(ctx.connection, p.propertyId);
    const audience = String(p.audience ?? "").trim();
    const dimensions = csv(p.dimensions);
    if (!audience) throw new Error("`audience` is required");
    if (!dimensions) throw new Error("`dimensions` is required — at least one dimension name");

    const body = compact({ audience, dimensions: named(dimensions) });

    ctx.log("info", "creating GA4 audience export", { property, audience });

    return await new GoogleAnalyticsClient(ctx).data(
      `/properties/${encodeURIComponent(property)}/audienceExports`,
      { method: "POST", body },
    );
  },
};

export default action;
