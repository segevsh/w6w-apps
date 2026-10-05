import type { ActionDefinition } from "@w6w/types";
import { BitwardenClient, compact } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "subscription-update",
  type: "perform",
  resource: "subscription",
  title: "Update the subscription",
  description:
    "Change seat counts, storage and autoscale ceilings. THIS CHANGES BILLING. Only the fields you set are sent, but whether Bitwarden treats an omitted field as unchanged or as cleared is not documented \u2014 set every value you care about.",
  idempotent: true,
  params: [
    {
      key: "pmSeats",
      label: "Password Manager seats",
      type: "number",
      validation: { min: 0, integer: true },
    },
    {
      key: "pmStorage",
      label: "Password Manager storage (GB)",
      type: "number",
      validation: { min: 0, integer: true },
    },
    {
      key: "pmMaxAutoScaleSeats",
      label: "Password Manager max autoscale seats",
      type: "number",
      validation: { min: 0, integer: true },
    },
    {
      key: "smSeats",
      label: "Secrets Manager seats",
      type: "number",
      validation: { min: 0, integer: true },
    },
    {
      key: "smServiceAccounts",
      label: "Secrets Manager service accounts",
      type: "number",
      validation: { min: 0, integer: true },
    },
    {
      key: "smMaxAutoScaleSeats",
      label: "Secrets Manager max autoscale seats",
      type: "number",
      validation: { min: 0, integer: true },
    },
    {
      key: "smMaxAutoScaleServiceAccounts",
      label: "Secrets Manager max autoscale service accounts",
      type: "number",
      validation: { min: 0, integer: true },
    },
  ],
  output: [
    { key: "updated", type: "boolean", label: "True when accepted" },
    { key: "sent", type: "object", label: "The body that was sent" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const nonNeg = (v: unknown, field: string): number | undefined => {
      if (v === undefined || v === null || v === "") return undefined;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0) {
        throw new Error(`\`${field}\` must be a non-negative integer`);
      }
      return n;
    };
    const passwordManager = compact({
      seats: nonNeg(p.pmSeats, "pmSeats"),
      storage: nonNeg(p.pmStorage, "pmStorage"),
      maxAutoScaleSeats: nonNeg(p.pmMaxAutoScaleSeats, "pmMaxAutoScaleSeats"),
    });
    const secretsManager = compact({
      seats: nonNeg(p.smSeats, "smSeats"),
      serviceAccounts: nonNeg(p.smServiceAccounts, "smServiceAccounts"),
      maxAutoScaleSeats: nonNeg(p.smMaxAutoScaleSeats, "smMaxAutoScaleSeats"),
      maxAutoScaleServiceAccounts: nonNeg(
        p.smMaxAutoScaleServiceAccounts,
        "smMaxAutoScaleServiceAccounts",
      ),
    });
    const body = compact({
      passwordManager: Object.keys(passwordManager).length ? passwordManager : undefined,
      secretsManager: Object.keys(secretsManager).length ? secretsManager : undefined,
    });
    if (!Object.keys(body).length) throw new Error("set at least one subscription field");
    await new BitwardenClient(ctx).request("/organization/subscription", { method: "PUT", body });
    return { updated: true, sent: body };
  },
};

export default action;
