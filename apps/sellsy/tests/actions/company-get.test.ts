import { test } from "node:test";
import action from "../../actions/company-get.ts";
import { runCase } from "./_run.ts";

test("company-get: makes the documented request and returns its result", () =>
  runCase(action));

test("company-get: is declared with this key", () => {
  if (action.key !== "company-get") throw new Error("key drift");
});
