import action from "../../actions/search.ts";
import { runCase } from "./_run.ts";

Deno.test("search: makes the documented request and returns its result", () => runCase(action));

Deno.test("search: is declared with this key", () => {
  if (action.key !== "search") throw new Error("key drift");
});
