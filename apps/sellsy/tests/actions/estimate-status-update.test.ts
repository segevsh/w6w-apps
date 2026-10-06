import action from "../../actions/estimate-status-update.ts";
import { runCase } from "./_run.ts";

Deno.test("estimate-status-update: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("estimate-status-update: is declared with this key", () => {
  if (action.key !== "estimate-status-update") throw new Error("key drift");
});
