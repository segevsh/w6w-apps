import type { ActionDefinition } from "@w6w/types";
import { GoogleAnalyticsClient, json, resolveProperty } from "../lib/client.ts";
import { PROPERTY_PARAM } from "../lib/params.ts";

/**
 * `POST /v1beta/properties/{property}:batchRunReports` — verified against
 * Google's Data API discovery document
 * (`analyticsdata.properties.batchRunReports`).
 *
 * Up to five reports in one round trip, all against the same property. The
 * `requests` array is passed as JSON: each entry is a full `RunReportRequest`,
 * so anything `report-run` can express belongs in it, and re-modelling that as
 * form fields would be a worse copy of the same schema.
 */
const action: ActionDefinition = {
  key: "report-batch-run",
  type: "read",
  resource: "report",
  title: "Run reports in a batch",
  description: "Run several GA4 reports against one property in a single request.",
  params: [
    PROPERTY_PARAM,
    {
      key: "requests",
      label: "Requests",
      type: "json",
      required: true,
      default: "",
      placeholder: '[{"dimensions":[{"name":"date"}],"metrics":[{"name":"activeUsers"}],' +
        '"dateRanges":[{"startDate":"7daysAgo","endDate":"yesterday"}]}]',
      hint: "An array of GA4 RunReportRequest objects. Google accepts at most 5.",
    },
  ],
  output: [
    { key: "reports", type: "array", label: "Reports" },
    { key: "kind", type: "string", label: "Kind" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const property = resolveProperty(ctx.connection, p.propertyId);
    const requests = json(p.requests, "requests");
    if (!Array.isArray(requests) || requests.length === 0) {
      throw new Error("`requests` is required — a non-empty array of RunReportRequest objects");
    }
    if (requests.length > 5) {
      // Google's own cap. Failing here names the limit; the API's error does not.
      throw new Error(`Google accepts at most 5 reports per batch — got ${requests.length}`);
    }

    ctx.log("info", "running GA4 batch report", { property, count: requests.length });

    return await new GoogleAnalyticsClient(ctx).data(
      `/properties/${encodeURIComponent(property)}:batchRunReports`,
      { method: "POST", body: { requests } },
    );
  },
};

export default action;
