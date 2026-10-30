import { test } from "node:test";
import action from "../../actions/company-delete.ts";
import { runCase } from "./_run.ts";

test("company-delete: makes the documented request and returns its result", () =>
  runCase(action));

test("company-delete: is declared with this key", () => {
  if (action.key !== "company-delete") throw new Error("key drift");
});
