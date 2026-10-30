import { test } from "node:test";
import action from "../../actions/item-get.ts";
import { runCase } from "./_run.ts";

test("item-get: makes the documented request and returns its result", () => runCase(action));

test("item-get: is declared with this key", () => {
  if (action.key !== "item-get") throw new Error("key drift");
});
