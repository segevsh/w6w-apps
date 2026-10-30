import { test } from "node:test";
import action from "../../actions/invoice-get.ts";
import { runCase } from "./_run.ts";

test("invoice-get: makes the documented request and returns its result", () =>
  runCase(action));

test("invoice-get: is declared with this key", () => {
  if (action.key !== "invoice-get") throw new Error("key drift");
});
