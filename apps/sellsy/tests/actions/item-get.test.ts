import action from "../../actions/item-get.ts";
import { runCase } from "./_run.ts";

Deno.test("item-get: makes the documented request and returns its result", () => runCase(action));

Deno.test("item-get: is declared with this key", () => {
  if (action.key !== "item-get") throw new Error("key drift");
});
