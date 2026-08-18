import type { ActionDefinition } from "@w6w/types";
import { compact, EasyPostClient } from "../lib/client.ts";

/**
 * `POST /v2/parcels` — describe a box once and reuse it.
 *
 * Most operations ship a handful of box sizes. Creating each as a parcel and
 * passing the id to `shipment-create` keeps the dimensions in one place rather
 * than repeated in every workflow, where one of them will eventually be wrong.
 *
 * ## Units are ounces and inches, and nothing checks
 *
 * `weight` is **ounces** and the dimensions are **inches**. Passing kilograms
 * and centimetres is not rejected — it rates a very small, very light parcel,
 * quotes a price, and the carrier bills the real weight afterwards. That
 * adjustment is the single most common surprise on a shipping invoice, so the
 * units are in every hint.
 *
 * `predefined_package` is the alternative for carrier-supplied packaging — a
 * USPS flat-rate box has fixed dimensions and its own pricing, and naming it
 * matters more than measuring it.
 */
const action: ActionDefinition = {
  key: "parcel-create",
  type: "perform",
  resource: "parcel",
  title: "Create a parcel",
  description:
    "Describe a box once and reuse its id. Weight is in OUNCES and dimensions in INCHES — " +
    "nothing validates that, and the carrier bills the real weight afterwards.",
  idempotent: false,
  params: [
    {
      key: "weight",
      label: "Weight (ounces)",
      type: "number",
      required: true,
      default: 0,
      hint: "OUNCES. 1 kg is 35.27 oz. Under-declaring is rebilled by the carrier weeks later.",
    },
    { key: "length", label: "Length (inches)", type: "number", default: 0 },
    { key: "width", label: "Width (inches)", type: "number", default: 0 },
    { key: "height", label: "Height (inches)", type: "number", default: 0 },
    {
      key: "predefinedPackage",
      label: "Predefined Package",
      type: "string",
      default: "",
      placeholder: "FlatRateEnvelope",
      hint: "Carrier packaging — a USPS flat-rate box has fixed dimensions and its own pricing, " +
        "so naming it matters more than measuring it. Replaces the dimensions above.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Parcel ID — pass this to `shipment-create`" },
    { key: "weight", type: "number", label: "Weight in ounces" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const weight = Number(p.weight ?? 0);
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error("`weight` is required, in ounces, and must be greater than zero");
    }
    const predefined = String(p.predefinedPackage ?? "").trim();
    const dims = ["length", "width", "height"].map((k) => Number(p[k] ?? 0));
    if (!predefined && dims.some((d) => !Number.isFinite(d) || d <= 0)) {
      throw new Error(
        "give length, width and height in inches, or a `predefinedPackage` instead",
      );
    }

    return await new EasyPostClient(ctx).request("/parcels", {
      method: "POST",
      wrapIn: "parcel",
      body: compact({
        weight,
        length: predefined ? undefined : dims[0],
        width: predefined ? undefined : dims[1],
        height: predefined ? undefined : dims[2],
        predefined_package: predefined || undefined,
      }),
    });
  },
};

export default action;
