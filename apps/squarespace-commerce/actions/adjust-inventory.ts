import type { ActionDefinition } from "@w6w/types";
import { API_V1, jsonParam, SquarespaceClient } from "../lib/client.ts";

/**
 * `POST /1.0/commerce/inventory/adjustments` — adjust stock quantities.
 *
 * Four operation arrays, all optional per the schema (`InventoryQuantityExpression[]`
 * members are `{quantity, variantId}`, and `setUnlimitedOperations` is a list of
 * variant ids), but at least one has to carry something for the call to mean
 * anything — so this action rejects an entirely empty request rather than
 * sending a no-op that returns `204` and looks like success.
 *
 * The four operations, in the vendor's own words:
 *
 *  - `incrementOperations` — adds `quantity`.
 *  - `decrementOperations` — subtracts `quantity` (and can take stock negative;
 *    increase/decrease are deltas, not absolutes).
 *  - `setFiniteOperations` — sets the absolute tracked quantity.
 *  - `setUnlimitedOperations` — turns stock tracking off for the listed
 *    variants (a list of ids, not `{quantity, variantId}` objects — that
 *    asymmetry is the vendor's).
 *
 * **`Idempotency-Key` is required**, and the vendor states the replay behaviour
 * plainly: a repeated key answers `204` with "previous operation was
 * successful, no new changes". Without the header the same silent no-op can
 * happen, which is why the action's own `idempotent: true` is honest — the
 * client stamps the key from the invocation id, so a retried step replays
 * rather than adjusting stock twice.
 *
 * Answers `204` with no body; the action reports `{ ok: true }`.
 */
interface Input {
  decrementOperations?: unknown;
  incrementOperations?: unknown;
  setFiniteOperations?: unknown;
  setUnlimitedOperations?: unknown;
}

const OPERATION_HINT =
  'Array of `{"quantity": 3, "variantId": "…"}` entries. `variantId` comes from List ' +
  "inventory.";

const adjustInventory: ActionDefinition<Input, { ok: true }> = {
  key: "adjust-inventory",
  type: "perform",
  resource: "inventory",
  title: "Adjust Inventory",
  description: "Increment, decrement, set or un-track stock for specific variants. At least one " +
    "operation array is required; an Idempotency-Key is stamped for you.",
  idempotent: true,
  params: [
    {
      key: "incrementOperations",
      label: "Increment operations",
      type: "json",
      hint: `Adds the given quantity to each variant's stock. ${OPERATION_HINT}`,
    },
    {
      key: "decrementOperations",
      label: "Decrement operations",
      type: "json",
      hint: `Subtracts the given quantity (a delta, so stock can go negative). ${OPERATION_HINT}`,
    },
    {
      key: "setFiniteOperations",
      label: "Set finite operations",
      type: "json",
      hint: `Sets each variant's tracked quantity to the given absolute value. ${OPERATION_HINT}`,
    },
    {
      key: "setUnlimitedOperations",
      label: "Set unlimited operations",
      type: "json",
      placeholder: '["variantId1","variantId2"]',
      hint: "Array of **variant ids** (not `{quantity, variantId}` objects) to stop tracking " +
        "stock for.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "True when Squarespace accepted it (HTTP 204)" }],

  async execute(input, ctx) {
    const body: Record<string, unknown> = {};
    const operations: Array<[string, unknown]> = [
      ["incrementOperations", jsonParam(input.incrementOperations, "incrementOperations")],
      ["decrementOperations", jsonParam(input.decrementOperations, "decrementOperations")],
      ["setFiniteOperations", jsonParam(input.setFiniteOperations, "setFiniteOperations")],
      ["setUnlimitedOperations", jsonParam(input.setUnlimitedOperations, "setUnlimitedOperations")],
    ];
    for (const [key, value] of operations) {
      if (value !== undefined) body[key] = value;
    }
    if (Object.keys(body).length === 0) {
      throw new Error(
        "at least one of incrementOperations, decrementOperations, setFiniteOperations or " +
          "setUnlimitedOperations is required — an empty adjustment returns 204 and changes " +
          "nothing",
      );
    }

    await new SquarespaceClient(ctx).post<void>(
      `${API_V1}/commerce/inventory/adjustments`,
      body,
      { idempotent: true },
    );
    return { ok: true };
  },
};

export default adjustInventory;
