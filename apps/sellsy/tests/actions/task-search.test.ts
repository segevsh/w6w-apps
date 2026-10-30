import { test } from "node:test";
import action from "../../actions/task-search.ts";
import { runCase } from "./_run.ts";

test("task-search: makes the documented request and returns its result", () =>
  runCase(action));

test("task-search: is declared with this key", () => {
  if (action.key !== "task-search") throw new Error("key drift");
});
