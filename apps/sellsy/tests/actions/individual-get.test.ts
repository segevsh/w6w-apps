import { test } from "node:test";
import action from "../../actions/individual-get.ts";
import { runCase } from "./_run.ts";

test("individual-get: makes the documented request and returns its result", () =>
  runCase(action));

test("individual-get: is declared with this key", () => {
  if (action.key !== "individual-get") throw new Error("key drift");
});
