import { test } from "node:test";
import action from "../../actions/individual-search.ts";
import { runCase } from "./_run.ts";

test("individual-search: makes the documented request and returns its result", () =>
  runCase(action));

test("individual-search: is declared with this key", () => {
  if (action.key !== "individual-search") throw new Error("key drift");
});
