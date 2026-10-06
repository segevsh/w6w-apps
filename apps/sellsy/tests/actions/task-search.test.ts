import action from "../../actions/task-search.ts";
import { runCase } from "./_run.ts";

Deno.test("task-search: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("task-search: is declared with this key", () => {
  if (action.key !== "task-search") throw new Error("key drift");
});
