import action from "../../actions/task-update.ts";
import { runCase } from "./_run.ts";

Deno.test("task-update: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("task-update: is declared with this key", () => {
  if (action.key !== "task-update") throw new Error("key drift");
});
