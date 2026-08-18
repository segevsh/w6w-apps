import type { ActionDefinition } from "@w6w/types";
import { companyIdFrom, GustoClient } from "../lib/client.ts";
import { COMPANY_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v1/companies/{company_id}/pay_schedules` — how often people are paid.
 *
 * A company can run several schedules at once — salaried staff monthly, hourly
 * staff fortnightly, a department on its own cadence — which is why any
 * calculation of "annual pay" from a rate needs the schedule to know what the
 * rate is *per*. `frequency` is the field that answers it.
 *
 * `auto_pilot` marks a schedule Gusto runs by itself unless somebody
 * intervenes, which changes what a reminder workflow should say: the deadline
 * is still real, but nobody has to press anything.
 */
const action: ActionDefinition = {
  key: "pay-schedule-list",
  type: "read",
  resource: "payroll",
  title: "List pay schedules",
  description:
    "A company's pay schedules and their frequencies — several can run at once, which is what " +
    "makes 'annualise this rate' ambiguous without them.",
  params: [COMPANY_PARAM, ...LIST_PARAMS],
  output: [
    { key: "uuid", type: "string", label: "Pay schedule UUID" },
    { key: "frequency", type: "string", label: "Frequency" },
    { key: "anchor_pay_date", type: "string", label: "Anchor pay date" },
    { key: "day_1", type: "number", label: "Day 1" },
    { key: "day_2", type: "number", label: "Day 2" },
    { key: "name", type: "string", label: "Name" },
    { key: "auto_pilot", type: "boolean", label: "Autopilot" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const companyId = companyIdFrom(ctx, p.companyId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);
    return await new GustoClient(ctx).requestAll(
      `/v1/companies/${encodeURIComponent(companyId)}/pay_schedules`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
