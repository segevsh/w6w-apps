import { test } from "node:test";
import action from "../../actions/opportunity-create.ts";
import { runCase } from "./_run.ts";

test("opportunity-create: makes the documented request and returns its result", () =>
  runCase(action));

test("opportunity-create: is declared with this key", () => {
  if (action.key !== "opportunity-create") throw new Error("key drift");
});
