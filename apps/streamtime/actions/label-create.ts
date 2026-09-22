import type { ActionDefinition } from "@w6w/types";
import { compact, StreamtimeClient } from "../lib/client.ts";
import { asOptionalJson, modelObjectParam } from "../lib/params.ts";

/**
 * `POST /labels` — attach a label to an entity, and optionally define it as a
 * master label at the same time.
 *
 * The `Label` model is fully writable here — `id`, `name`, `entityId`,
 * `labelType` — because on this route `id` is the **master label** the new
 * attachment refers to, not a server-assigned key. `create_master_label` is a
 * query parameter that also creates a master label, which is how a one-off label
 * becomes reusable.
 */
interface Input {
  id: number;
  name: string;
  entityId: number;
  labelType?: unknown;
  createMasterLabel?: boolean;
}

const labelCreate: ActionDefinition<Input> = {
  key: "label-create",
  type: "perform",
  resource: "label",
  title: "Create Label",
  description: "Attach a label to an entity, optionally creating the master label too.",
  idempotent: false,
  params: [
    {
      key: "id",
      label: "Label ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "The master label this attaches; the model types it as writable on this route.",
    },
    { key: "name", label: "Name", type: "string", required: true, placeholder: "Urgent" },
    {
      key: "entityId",
      label: "Entity ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
      hint: "The job, quote or user the label is attached to.",
    },
    modelObjectParam("labelType", "Label Type", '{ "id": 1, "name": "Job" }'),
    {
      key: "createMasterLabel",
      label: "Create Master Label",
      type: "boolean",
      default: false,
      hint: "Streamtime's `create_master_label` query parameter.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Label ID" },
    { key: "name", type: "string", label: "Label name" },
    { key: "entityId", type: "number", label: "Entity the label is attached to" },
  ],

  execute(input, ctx) {
    return new StreamtimeClient(ctx).request("/labels", {
      method: "POST",
      query: compact({
        create_master_label: input.createMasterLabel === true ? "true" : undefined,
      }),
      body: compact({
        id: input.id,
        name: input.name,
        entityId: input.entityId,
        labelType: asOptionalJson(input.labelType, "labelType"),
      }),
    });
  },
};

export default labelCreate;
