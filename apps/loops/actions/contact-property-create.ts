import type { ActionDefinition } from "@w6w/types";
import { LoopsClient } from "../lib/client.ts";

/**
 * `POST /v1/contacts/properties` — verified against Loops' OpenAPI document.
 *
 * **The type is permanent.** Loops offers no endpoint to change a property's
 * type or to delete it, so a property created as `string` when it should have
 * been `number` stays that way and every later write has to match. That is why
 * this is its own deliberate action rather than something a contact write does
 * implicitly.
 */
const action: ActionDefinition = {
  key: "contact-property-create",
  type: "perform",
  resource: "contact-property",
  title: "Create a contact property",
  description: "Define a custom contact property so contact writes may set it.",
  idempotent: true,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
      placeholder: "plan",
      hint: "The key contact writes will use.",
    },
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      default: "string",
      options: [
        { value: "string", label: "String" },
        { value: "number", label: "Number" },
        { value: "boolean", label: "Boolean" },
        { value: "date", label: "Date" },
      ],
      hint: "PERMANENT — Loops offers no way to change a property's type or remove it.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Created" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");
    const type = String(p.type ?? "string");

    ctx.log("info", "creating a Loops contact property", { name, type });

    return await new LoopsClient(ctx).request("/contacts/properties", {
      method: "POST",
      body: { name, type },
    });
  },
};

export default action;
