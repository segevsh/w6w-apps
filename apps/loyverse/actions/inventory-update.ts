import type { ActionDefinition } from "@w6w/types";
import { LoyverseClient } from "../lib/client.ts";

/**
 * `POST /v1.0/inventory` — batch set absolute stock levels (`stock_after`).
 * It sets, it does not add: the same batch twice leaves the same stock, so it is
 * safe to retry.
 */
interface Change {
  variant_id: string;
  store_id: string;
  stock_after: number;
}
interface Input {
  levels: Change[] | string;
}

function parseLevels(raw: Change[] | string): Change[] {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      throw new Error("levels is not valid JSON");
    }
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("levels must be a non-empty array");
  }
  for (const [i, c] of value.entries()) {
    const ch = c as Partial<Change>;
    if (!ch?.variant_id || !ch?.store_id || typeof ch.stock_after !== "number") {
      throw new Error(`levels[${i}] needs variant_id, store_id and a numeric stock_after`);
    }
  }
  return value as Change[];
}

const inventoryUpdate: ActionDefinition<Input> = {
  key: "inventory-update",
  type: "perform",
  resource: "inventory",
  title: "Update Inventory Levels",
  description: "Set the absolute stock level of item variants in stores (batch).",
  idempotent: true,
  params: [
    {
      key: "levels",
      label: "Levels",
      type: "json",
      required: true,
      hint:
        'Array of {"variant_id","store_id","stock_after"}. stock_after is the new total, not a delta.',
    },
  ],
  output: [{ key: "inventory_levels", type: "array", label: "Updated levels" }],
  async execute(input, ctx) {
    return await new LoyverseClient(ctx).json("/inventory", {
      method: "POST",
      body: { inventory_levels: parseLevels(input.levels) },
    });
  },
};

export default inventoryUpdate;
