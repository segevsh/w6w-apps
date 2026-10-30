import { test } from "node:test";
import action from "../../actions/search.ts";
import { runCase } from "./_run.ts";

test("search: makes the documented request and returns its result", () => runCase(action));

test("search: is declared with this key", () => {
  if (action.key !== "search") throw new Error("key drift");
});
