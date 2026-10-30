import { test } from "node:test";
import action from "../../actions/individual-create.ts";
import { runCase } from "./_run.ts";

test("individual-create: makes the documented request and returns its result", () =>
  runCase(action));

test("individual-create: is declared with this key", () => {
  if (action.key !== "individual-create") throw new Error("key drift");
});
