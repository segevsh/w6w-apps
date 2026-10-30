import { test } from "node:test";
import action from "../../actions/company-update.ts";
import { runCase } from "./_run.ts";

test("company-update: makes the documented request and returns its result", () =>
  runCase(action));

test("company-update: is declared with this key", () => {
  if (action.key !== "company-update") throw new Error("key drift");
});
