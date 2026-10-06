import action from "../../actions/item-search.ts";
import { runCase } from "./_run.ts";

Deno.test("item-search: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("item-search: is declared with this key", () => {
  if (action.key !== "item-search") throw new Error("key drift");
});
