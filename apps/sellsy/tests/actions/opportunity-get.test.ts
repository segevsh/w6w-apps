import action from "../../actions/opportunity-get.ts";
import { runCase } from "./_run.ts";

Deno.test("opportunity-get: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("opportunity-get: is declared with this key", () => {
  if (action.key !== "opportunity-get") throw new Error("key drift");
});
