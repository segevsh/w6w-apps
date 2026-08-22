import type { ActionDefinition } from "@w6w/types";
import { ParticleClient, query } from "../lib/client.ts";

/**
 * `GET /v1/sims` — the cellular SIMs on this account, and what they are using.
 *
 * ## This is the only place the running cost of a fleet is visible
 *
 * A cellular device bills on data. A device with a firmware bug that publishes
 * every second instead of every hour does not look broken — it looks connected,
 * responsive and healthy — and shows up as a data bill weeks later. The usage
 * figures here are the only signal before the invoice.
 *
 * ## An inactive SIM is not the same as a disconnected device
 *
 * `status` describes the SIM's own state. A deactivated SIM means the device
 * cannot connect at all, however healthy the hardware; and reactivating is not
 * instant, so deactivating a SIM to save money is a decision with a delay on
 * the way back.
 *
 * ## The `_over_limit` state is the one that silences a fleet
 *
 * A SIM that passes its monthly data limit stops passing traffic. Every device
 * on it goes offline at once, looking exactly like a regional outage, and the
 * cause is a number nobody was watching.
 */
const action: ActionDefinition = {
  key: "sim-list",
  type: "search",
  resource: "sim",
  title: "List SIMs",
  description:
    "Cellular SIMs and their data usage — the only visibility into a fleet's running cost before " +
    "the invoice. A SIM over its data limit silences its device while looking like an outage.",
  params: [
    {
      key: "iccid",
      label: "ICCID Contains",
      type: "string",
      default: "",
    },
    {
      key: "perPage",
      label: "Page Size",
      type: "number",
      default: 100,
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
    },
  ],
  output: [
    { key: "sims", type: "array", label: "The SIMs" },
    { key: "count", type: "number", label: "Returned in this page" },
    { key: "iccids", type: "array", label: "Just the ICCIDs" },
    { key: "activeCount", type: "number", label: "How many can carry traffic" },
    { key: "overLimitCount", type: "number", label: "How many have been cut off for data use" },
    { key: "totalMbUsed", type: "number", label: "Data used this period, across them" },
    { key: "heaviest", type: "object", label: "The SIM using the most — where a bug shows up" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;

    const response = await new ParticleClient(ctx).request<
      {
        sims?: Array<Record<string, unknown>>;
      } | Array<Record<string, unknown>>
    >("/v1/sims", {
      query: query({
        iccid: p.iccid,
        per_page: Math.min(1000, Math.max(1, Number(p.perPage ?? 100))),
        page: Math.max(1, Number(p.page ?? 1)),
      }),
    });

    const sims = Array.isArray(response) ? response : (response?.sims ?? []);
    const mb = (sim: Record<string, unknown>) => Number(sim?.mb_used ?? 0) || 0;
    // A SIM over its limit stops passing traffic — the device looks offline.
    const overLimit = sims.filter((sim) => String(sim?.status ?? "").includes("over_limit"));
    const heaviest = [...sims].sort((a, b) => mb(b) - mb(a))[0];

    if (overLimit.length) {
      ctx.log(
        "warn",
        "some Particle SIMs are over their data limit and are no longer passing traffic — the " +
          "devices on them will look offline",
        { overLimitCount: overLimit.length },
      );
    }

    return {
      sims,
      count: sims.length,
      iccids: sims.map((sim) => sim?.iccid).filter(Boolean),
      activeCount: sims.filter((sim) => sim?.status === "active").length,
      overLimitCount: overLimit.length,
      totalMbUsed: sims.reduce((sum, sim) => sum + mb(sim), 0),
      heaviest,
    };
  },
};

export default action;
