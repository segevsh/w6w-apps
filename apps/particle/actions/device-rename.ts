import type { ActionDefinition } from "@w6w/types";
import { compact, deviceId, ParticleClient } from "../lib/client.ts";
import { DEVICE_PARAM } from "../lib/params.ts";

/**
 * `PUT /v1/devices/{id}` — rename a device, or note something about it.
 *
 * ## The name is for people; the id is what everything else uses
 *
 * Renaming changes nothing functional. The device keeps its id, its firmware
 * and its connection, and every stored reference keeps working — which is the
 * opposite of most systems, where a rename breaks things.
 *
 * What it does change is what appears in the console, in the event stream's
 * metadata and in every alert somebody reads at 3am. A fleet of devices called
 * `my-device-copy-2` is a fleet nobody can triage.
 *
 * ## Notes are the only free-text field on a device
 *
 * Which makes them the place for the thing that is not in the id: where the
 * device physically is. That is what an operator actually needs, and there is
 * nowhere else to put it.
 */
const action: ActionDefinition = {
  key: "device-rename",
  type: "perform",
  resource: "device",
  title: "Rename a device",
  description:
    "Change a device's name or notes. Renaming breaks nothing — the id, firmware and connection " +
    "are untouched — but it is what appears in every alert somebody has to triage.",
  idempotent: true,
  params: [
    DEVICE_PARAM,
    {
      key: "name",
      label: "Name",
      type: "string",
      default: "",
      hint: "Blank leaves it unchanged.",
    },
    {
      key: "notes",
      label: "Notes",
      type: "string",
      default: "",
      hint: "The only free-text field a device has — the natural place for where it physically " +
        "is, which nothing else records.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "The device" },
    { key: "name", type: "string", label: "Its name now" },
    { key: "notes", type: "string", label: "Its notes now" },
    { key: "changed", type: "array", label: "The fields this call submitted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = deviceId(p.deviceId);

    const form = compact({ name: p.name, notes: p.notes }) as Record<string, string>;
    if (!Object.keys(form).length) {
      throw new Error("nothing to change — give a `name` or `notes`");
    }

    const device = await new ParticleClient(ctx).request<{ name?: string; notes?: string }>(
      `/v1/devices/${id}`,
      { method: "PUT", form },
    );

    return {
      id,
      name: device?.name,
      notes: device?.notes,
      changed: Object.keys(form),
    };
  },
};

export default action;
