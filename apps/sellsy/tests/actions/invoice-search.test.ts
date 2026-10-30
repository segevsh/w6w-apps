import { test } from "node:test";
import action from "../../actions/invoice-search.ts";
import { runCase } from "./_run.ts";

test("invoice-search: makes the documented request and returns its result", () =>
  runCase(action));

test("invoice-search: is declared with this key", () => {
  if (action.key !== "invoice-search") throw new Error("key drift");
});
