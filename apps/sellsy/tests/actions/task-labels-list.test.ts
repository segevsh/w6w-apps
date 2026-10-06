import action from "../../actions/task-labels-list.ts";
import { runCase } from "./_run.ts";

Deno.test("task-labels-list: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("task-labels-list: is declared with this key", () => {
  if (action.key !== "task-labels-list") throw new Error("key drift");
});
