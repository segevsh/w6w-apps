import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, MaintainXClient } from "../lib/client.ts";
import { organizationIdParam } from "../lib/params.ts";

/**
 * `POST /v1/meterreadings` — the BATCH endpoint, used even for one reading. The
 * single-reading endpoint (`POST /meters/{id}/readings`) is limited to 10
 * requests per 24 hours for manual meters and 1 per 10 seconds for automated
 * ones, and the vendor itself recommends the batch form; a batch counts as one
 * request toward the limit.
 */
interface Reading {
  meterId: number;
  value: number;
  readingDate?: string;
}

interface Input {
  readings: string | Reading[];
  organizationId?: number;
}

const meterReadingsAdd: ActionDefinition<Input> = {
  key: "meter-readings-add",
  type: "perform",
  resource: "meter",
  title: "Add Meter Readings",
  description: "Record one or more meter readings in a single request.",
  // A repeated reading is stored again as a new data point.
  idempotent: false,
  params: [
    {
      key: "readings",
      label: "Readings (JSON array)",
      type: "json",
      required: true,
      hint: '[{"meterId": 12, "value": 340.5, "readingDate": "2026-10-06T08:00:00.000Z"}]',
    },
    organizationIdParam,
  ],
  output: [{ key: "readings", type: "array", label: "Stored readings" }],

  async execute(input, ctx) {
    const readings = asOptionalJson<Reading[]>(input.readings, "readings");
    if (!Array.isArray(readings) || readings.length === 0) {
      throw new Error("readings must be a non-empty JSON array");
    }
    for (const [i, r] of readings.entries()) {
      if (typeof r?.meterId !== "number" || typeof r?.value !== "number") {
        throw new Error(`readings[${i}] needs a numeric meterId and a numeric value`);
      }
    }
    const stored = await new MaintainXClient(ctx).request<unknown[]>("/meterreadings", {
      method: "POST",
      body: readings,
      organizationId: input.organizationId,
    });
    return { readings: stored ?? [] };
  },
};

export default meterReadingsAdd;
