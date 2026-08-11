/**
 * Decimal money handling for the Splitwise expense model.
 *
 * Splitwise carries every amount as a **string**, not a number: `cost` is
 * documented as "A string representation of a decimal value, limited to 2
 * decimal places", and `paid_share` / `owed_share` as "Decimal amount as a
 * string with 2 decimal places". Its own examples are inconsistent about the
 * shape of that string — the request example sends `"25"` and `"0"`, the
 * response example carries `"25.0"`, `"8.99"` and `"4.5"` — so a parser that
 * insists on exactly two decimals rejects the vendor's own documented values.
 *
 * Nothing here converts to `number` for arithmetic. Shares must sum to the
 * total, and floating-point addition does not: in IEEE 754,
 * `10.10 + 10.10 + 10.10 === 30.299999999999997`, so an even three-way split of
 * a $30.30 bill fails a `=== 30.30` comparison and would be reported as
 * unbalanced. (Not every split drifts — `33.33 + 33.33 + 33.34` happens to come
 * out at exactly `100` — which is worse than if they all did, because it means
 * the bug ships green and surfaces on somebody's grocery run.) Every comparison
 * in this app is therefore done in integer minor units ("cents").
 */

/** The vendor's own constraint: "limited to 2 decimal places". */
const AMOUNT_PATTERN = /^-?\d+(\.\d{1,2})?$/;

/**
 * The pattern a `cost` / share Param advertises, so the editor rejects a bad
 * value before an invocation is spent. Kept as a string because `Validation`
 * carries `pattern` as a source string, and exported so the Params and the
 * runtime check can never disagree about what is legal.
 */
export const AMOUNT_PATTERN_SOURCE = "^-?\\d+(\\.\\d{1,2})?$";

/**
 * Parse a Splitwise decimal string into integer minor units.
 *
 * Accepts `"25"`, `"25.0"` and `"25.00"` — all three appear in the vendor's own
 * documentation for the same field — and rejects anything with more than two
 * decimal places, which the vendor states it does not accept. A `number` is
 * accepted for convenience (a workflow expression that computed the amount) and
 * is stringified first, so it goes through exactly the same validation.
 */
export function toMinorUnits(value: string | number, label: string): number {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${label} is required`);
  }
  const raw = typeof value === "number" ? String(value) : String(value).trim();
  if (!AMOUNT_PATTERN.test(raw)) {
    throw new Error(
      `${label} must be a decimal amount with at most 2 decimal places, got "${raw}" — ` +
        "Splitwise documents every amount as a string limited to 2 decimal places",
    );
  }
  const negative = raw.startsWith("-");
  const [whole, fraction = ""] = raw.replace("-", "").split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return negative ? -cents : cents;
}

/** Render integer minor units back as a 2-decimal string, for error messages. */
export function fromMinorUnits(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Sum a list of amounts in integer minor units. */
export function sumMinorUnits(values: Array<string | number>, label: string): number {
  return values.reduce<number>((total, v, i) => total + toMinorUnits(v, `${label}[${i}]`), 0);
}
