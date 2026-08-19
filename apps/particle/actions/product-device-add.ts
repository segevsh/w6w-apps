import type { ActionDefinition } from "@w6w/types";
import { csv, ParticleClient } from "../lib/client.ts";

/**
 * `POST /v1/products/{product}/devices` — add devices to a product fleet.
 *
 * ## Adding a device to a product changes who owns it
 *
 * A device in a product belongs to the **product**, not to the person who
 * claimed it. That is the point — a fleet is managed together, firmware is
 * released to it rather than flashed device by device — and it is a one-way
 * enough change to be worth understanding first:
 *
 * - The device leaves the claiming account's own device list. A workflow using
 *   a personal token to reach it stops working, with a 403.
 * - Product firmware releases now apply to it. A device added to a product
 *   with an active release will be **updated to that firmware** the next time
 *   it connects, without anyone touching it.
 *
 * That second point is the one that surprises people: adding a device to a
 * product can reflash it.
 *
 * ## Devices are added by id, in bulk
 *
 * The API takes a comma-separated list, and it is the same call for one or a
 * thousand. Devices that are already in the product are reported rather than
 * failing the batch.
 */
const action: ActionDefinition = {
  key: "product-device-add",
  type: "perform",
  resource: "device",
  title: "Add devices to a product",
  description:
    "Move devices into a product fleet. The product then OWNS them — they leave the claiming " +
    "account, and an active product firmware release will reflash them on their next " +
    "connection, without anyone touching the device.",
  idempotent: true,
  params: [
    {
      key: "product",
      label: "Product",
      type: "string",
      required: true,
      default: "",
      hint: "A product id or slug — `product-list` reports both.",
    },
    {
      key: "deviceIds",
      label: "Device IDs",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated, 24 hex characters each. The same call handles one or a thousand.",
    },
    {
      key: "confirmFirmwareRelease",
      label: "I understand these devices may be reflashed",
      type: "boolean",
      default: false,
      required: true,
      hint: "If the product has an active firmware release, these devices are updated to it on " +
        "their next connection.",
    },
  ],
  output: [
    { key: "added", type: "boolean", label: "Whether the call was accepted" },
    { key: "product", type: "string", label: "The product" },
    { key: "requested", type: "number", label: "How many ids were submitted" },
    { key: "updated", type: "number", label: "How many Particle reported adding" },
    { key: "existing", type: "array", label: "Ids already in the product" },
    { key: "nonmemberDeviceIds", type: "array", label: "Ids Particle could not add" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const product = String(p.product ?? "").trim();
    if (!product) throw new Error("`product` is required");

    const ids = csv(p.deviceIds);
    if (!ids || !ids.length) throw new Error("`deviceIds` must name at least one device");
    const malformed = ids.filter((id) => !/^[0-9a-f]{24}$/i.test(id));
    if (malformed.length) {
      throw new Error(
        `these are not 24-character hexadecimal device ids: ${malformed.join(", ")}. Adding a ` +
          "device to a product takes ids rather than names",
      );
    }

    if (p.confirmFirmwareRelease !== true) {
      throw new Error(
        "set `confirmFirmwareRelease` — a device added to a product with an active firmware " +
          "release is updated to that firmware the next time it connects, with nobody touching " +
          "the device. It also leaves the claiming account, so a personal token stops reaching it",
      );
    }

    const result = await new ParticleClient(ctx).request<{
      updated?: number;
      existingDeviceIds?: string[];
      nonmemberDeviceIds?: string[];
      invalidDeviceIds?: string[];
    }>(`/v1/products/${encodeURIComponent(product)}/devices`, {
      method: "POST",
      form: { ids: ids.join(",") },
    });

    ctx.log("warn", "added devices to a Particle product — they now belong to the product", {
      product,
      requested: ids.length,
      updated: result?.updated,
    });

    return {
      added: true,
      product,
      requested: ids.length,
      updated: result?.updated,
      // Already-present devices are reported rather than failing the batch.
      existing: result?.existingDeviceIds ?? [],
      nonmemberDeviceIds: result?.nonmemberDeviceIds ?? result?.invalidDeviceIds ?? [],
    };
  },
};

export default action;
