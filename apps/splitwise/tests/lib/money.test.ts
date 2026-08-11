import { assertEquals, assertThrows } from "@std/assert";
import { fromMinorUnits, sumMinorUnits, toMinorUnits } from "../../lib/money.ts";

Deno.test("money: accepts every decimal shape the vendor's own docs use", () => {
  // The request example sends "25" and "0"; the response example carries
  // "25.0", "8.99" and "4.5". A parser demanding exactly 2 decimals would
  // reject four of those five.
  assertEquals(toMinorUnits("25", "cost"), 2500);
  assertEquals(toMinorUnits("0", "cost"), 0);
  assertEquals(toMinorUnits("25.0", "cost"), 2500);
  assertEquals(toMinorUnits("8.99", "cost"), 899);
  assertEquals(toMinorUnits("4.5", "cost"), 450);
});

Deno.test("money: accepts a number, through the same validation", () => {
  assertEquals(toMinorUnits(25, "cost"), 2500);
  assertEquals(toMinorUnits(13.55, "cost"), 1355);
  assertThrows(() => toMinorUnits(1.234, "cost"), Error, "at most 2 decimal places");
});

Deno.test("money: negative amounts survive", () => {
  assertEquals(toMinorUnits("-5.02", "amount"), -502);
  assertEquals(fromMinorUnits(-502), "-5.02");
});

Deno.test("money: rejects what Splitwise says it does not accept", () => {
  assertThrows(() => toMinorUnits("25.005", "cost"), Error, "at most 2 decimal places");
  assertThrows(() => toMinorUnits("twelve", "cost"), Error, "at most 2 decimal places");
  assertThrows(() => toMinorUnits("$25.00", "cost"), Error, "at most 2 decimal places");
  assertThrows(() => toMinorUnits("1e3", "cost"), Error, "at most 2 decimal places");
  assertThrows(() => toMinorUnits("", "cost"), Error, "cost is required");
});

Deno.test("money: the error names the field, so a bad share says which one", () => {
  assertThrows(() => toMinorUnits("x", "users[2].owed_share"), Error, "users[2].owed_share");
});

/**
 * The whole reason this module exists, with the drift measured rather than
 * assumed: an even three-way split of a $30.30 bill is `30.299999999999997` in
 * IEEE 754, so a float comparison reports a perfectly balanced split as
 * unbalanced and refuses to send it.
 *
 * The second assertion is the one that matters: it pins the failing float case
 * so this test cannot pass vacuously against an example that happens not to
 * drift. `33.33 + 33.33 + 33.34` is exactly such an example — it comes out at
 * precisely `100` — which is why it is asserted here too, as the reason the
 * float bug would otherwise ship green.
 */
Deno.test("money: an even three-way split sums exactly where floats do not", () => {
  assertEquals(sumMinorUnits(["10.10", "10.10", "10.10"], "owed_share"), 3030);
  assertEquals(10.10 + 10.10 + 10.10 === 30.30, false, "the float trap this module avoids");
  assertEquals(33.33 + 33.33 + 33.34 === 100, true, "and the near-miss that hides it");
  assertEquals(sumMinorUnits(["33.33", "33.33", "33.34"], "owed_share"), 10000);
});

Deno.test("money: fromMinorUnits pads to two decimals", () => {
  assertEquals(fromMinorUnits(0), "0.00");
  assertEquals(fromMinorUnits(5), "0.05");
  assertEquals(fromMinorUnits(2500), "25.00");
  assertEquals(fromMinorUnits(10001), "100.01");
});

Deno.test("money: sums an empty list to zero", () => {
  assertEquals(sumMinorUnits([], "paid_share"), 0);
});
