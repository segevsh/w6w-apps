import action from "../../actions/estimate-search.ts";
import { runCase } from "./_run.ts";

Deno.test("estimate-search: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("estimate-search: is declared with this key", () => {
  if (action.key !== "estimate-search") throw new Error("key drift");
});
