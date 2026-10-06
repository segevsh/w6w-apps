import type { ActionDefinition } from "@w6w/types";
import { compact, LoyverseClient } from "../lib/client.ts";

/**
 * `POST /v1.0/categories` — create, or update when `id` is given. Loyverse has
 * no separate PUT/PATCH; the body's `id` decides.
 */
interface Input {
  id?: string;
  name: string;
  color?: string;
}

const categorySave: ActionDefinition<Input> = {
  key: "category-save",
  type: "perform",
  resource: "category",
  title: "Create or Update Category",
  description: "Create a category, or update one when an id is given.",
  idempotent: false,
  params: [
    {
      key: "id",
      label: "Category id",
      type: "string",
      hint: "Leave empty to create; set to update that category.",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      validation: { minLength: 1, maxLength: 64 },
    },
    {
      key: "color",
      label: "Color",
      type: "select",
      options: ["GREY", "RED", "PINK", "ORANGE", "GREEN", "BLUE", "PURPLE"].map((v) => ({
        value: v,
        label: v[0] + v.slice(1).toLowerCase(),
      })),
    },
  ],
  output: [
    { key: "id", type: "string", label: "Category id" },
    { key: "name", type: "string", label: "Name" },
    { key: "color", type: "string", label: "Color" },
  ],
  async execute(input, ctx) {
    if (!String(input.name ?? "").trim()) throw new Error("Name is required");
    return await new LoyverseClient(ctx).json("/categories", {
      method: "POST",
      body: compact({ id: input.id, name: input.name, color: input.color }),
    });
  },
};

export default categorySave;
