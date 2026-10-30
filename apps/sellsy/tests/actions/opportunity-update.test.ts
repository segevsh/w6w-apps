import { test } from "node:test";
import action from "../../actions/opportunity-update.ts";
import { runCase } from "./_run.ts";

test("opportunity-update: makes the documented request and returns its result", () =>
  runCase(action));

test("opportunity-update: is declared with this key", () => {
  if (action.key !== "opportunity-update") throw new Error("key drift");
});
