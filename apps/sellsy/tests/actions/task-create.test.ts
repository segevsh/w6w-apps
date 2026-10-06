import action from "../../actions/task-create.ts";
import { runCase } from "./_run.ts";

Deno.test("task-create: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("task-create: is declared with this key", () => {
  if (action.key !== "task-create") throw new Error("key drift");
});
