import { test } from "node:test";
import action from "../../actions/item-search.ts";
import { runCase } from "./_run.ts";

test("item-search: makes the documented request and returns its result", () =>
  runCase(action));

test("item-search: is declared with this key", () => {
  if (action.key !== "item-search") throw new Error("key drift");
});
