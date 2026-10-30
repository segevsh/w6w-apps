import { test } from "node:test";
import action from "../../actions/company-create.ts";
import { runCase } from "./_run.ts";

test("company-create: makes the documented request and returns its result", () =>
  runCase(action));

test("company-create: is declared with this key", () => {
  if (action.key !== "company-create") throw new Error("key drift");
});
