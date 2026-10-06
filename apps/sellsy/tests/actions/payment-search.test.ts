import action from "../../actions/payment-search.ts";
import { runCase } from "./_run.ts";

Deno.test("payment-search: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("payment-search: is declared with this key", () => {
  if (action.key !== "payment-search") throw new Error("key drift");
});
