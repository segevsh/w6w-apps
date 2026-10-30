import { test } from "node:test";
import action from "../../actions/task-labels-list.ts";
import { runCase } from "./_run.ts";

test("task-labels-list: makes the documented request and returns its result", () =>
  runCase(action));

test("task-labels-list: is declared with this key", () => {
  if (action.key !== "task-labels-list") throw new Error("key drift");
});
