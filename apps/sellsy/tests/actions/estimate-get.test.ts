import action from "../../actions/estimate-get.ts";
import { runCase } from "./_run.ts";

Deno.test("estimate-get: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("estimate-get: is declared with this key", () => {
  if (action.key !== "estimate-get") throw new Error("key drift");
});
