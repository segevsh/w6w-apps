import action from "../../actions/opportunity-update.ts";
import { runCase } from "./_run.ts";

Deno.test("opportunity-update: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("opportunity-update: is declared with this key", () => {
  if (action.key !== "opportunity-update") throw new Error("key drift");
});
