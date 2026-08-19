import type { ActionDefinition } from "@w6w/types";
import { CloudClient, query } from "../lib/client.ts";

/**
 * `GET /v1/organizations/{org}/usageCost` — what it has cost.
 *
 * ## Cost is broken down by what actually drives it
 *
 * ClickHouse Cloud bills on three separate things, and they behave differently
 * enough that a single total hides the useful answer:
 *
 * - **Compute**, per replica-hour while a service is running. This is where
 *   idle scaling shows up: a service with it off bills 24 hours a day.
 * - **Storage**, per byte, compressed. Usually the smaller number and the one
 *   that only ever grows.
 * - **Data transfer**, which surprises people, because a query returning a lot
 *   of rows to somewhere outside the region is billed for it.
 *
 * ## This is the only place the platform reports money
 *
 * Nothing on a service says what it costs. `service-list` reports
 * `idleScaling`, which is the *cause*; this reports the consequence, and the
 * two together are how a workflow can find the service worth turning off.
 *
 * ## The window is capped
 *
 * ClickHouse Cloud limits how wide a usage query may be, so this is a
 * period-by-period question rather than a lifetime one.
 */
const action: ActionDefinition = {
  key: "usage-cost",
  type: "read",
  resource: "cost",
  title: "Get usage and cost",
  description:
    "What the organisation has spent, split into compute, storage and data transfer. The only " +
    "place this platform reports money — and compute is where a service with idle scaling off " +
    "shows up.",
  params: [
    {
      key: "fromDate",
      label: "From",
      type: "string",
      required: true,
      default: "",
      placeholder: "2026-08-01",
    },
    {
      key: "toDate",
      label: "To",
      type: "string",
      required: true,
      default: "",
      placeholder: "2026-08-19",
    },
  ],
  output: [
    { key: "records", type: "array", label: "The usage records" },
    { key: "count", type: "number", label: "How many" },
    { key: "totalCost", type: "number", label: "Everything, in the organisation's currency" },
    { key: "computeCost", type: "number", label: "Replica-hours — where idle scaling shows up" },
    { key: "storageCost", type: "number", label: "Bytes stored" },
    { key: "dataTransferCost", type: "number", label: "Rows leaving the region" },
    { key: "byService", type: "object", label: "Total per service id" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const fromDate = String(p.fromDate ?? "").trim();
    const toDate = String(p.toDate ?? "").trim();
    if (!fromDate || !toDate) {
      throw new Error(
        "`fromDate` and `toDate` are both required — ClickHouse Cloud caps how wide a usage " +
          "query may be, so this is a period question rather than a lifetime one",
      );
    }

    const result = await new CloudClient(ctx).request<{
      grandTotalCHC?: number;
      costs?: Array<Record<string, unknown>>;
    }>("/usageCost", { query: query({ from_date: fromDate, to_date: toDate }) });

    const records = Array.isArray(result?.costs) ? result.costs : [];
    const num = (value: unknown) => Number(value ?? 0) || 0;
    const sum = (key: string) => records.reduce((total, row) => total + num(row[key]), 0);

    const byService: Record<string, number> = {};
    for (const row of records) {
      const id = String(row.entityId ?? row.serviceId ?? "");
      if (!id) continue;
      byService[id] = (byService[id] ?? 0) +
        num(row.totalCHC) + num(row.computeCHC) + num(row.storageCHC);
    }

    return {
      records,
      count: records.length,
      totalCost: num(result?.grandTotalCHC) || sum("totalCHC"),
      // Where a service with idle scaling off shows up.
      computeCost: sum("computeCHC"),
      storageCost: sum("storageCHC"),
      dataTransferCost: sum("dataTransferCHC") + sum("publicDataTransferCHC"),
      byService,
    };
  },
};

export default action;
