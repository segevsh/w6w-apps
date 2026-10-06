import action from "../../actions/opportunity-search.ts";
import { runCase } from "./_run.ts";

Deno.test("opportunity-search: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("opportunity-search: is declared with this key", () => {
  if (action.key !== "opportunity-search") throw new Error("key drift");
});
