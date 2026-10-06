import action from "../../actions/individual-search.ts";
import { runCase } from "./_run.ts";

Deno.test("individual-search: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("individual-search: is declared with this key", () => {
  if (action.key !== "individual-search") throw new Error("key drift");
});
