import action from "../../actions/quota-get.ts";
import { runCase } from "./_run.ts";

Deno.test("quota-get: makes the documented request and returns its result", () => runCase(action));

Deno.test("quota-get: is declared with this key", () => {
  if (action.key !== "quota-get") throw new Error("key drift");
});
