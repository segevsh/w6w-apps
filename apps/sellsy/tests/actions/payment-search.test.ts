import { test } from "node:test";
import action from "../../actions/payment-search.ts";
import { runCase } from "./_run.ts";

test("payment-search: makes the documented request and returns its result", () =>
  runCase(action));

test("payment-search: is declared with this key", () => {
  if (action.key !== "payment-search") throw new Error("key drift");
});
