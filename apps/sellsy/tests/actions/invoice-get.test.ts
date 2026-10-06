import action from "../../actions/invoice-get.ts";
import { runCase } from "./_run.ts";

Deno.test("invoice-get: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("invoice-get: is declared with this key", () => {
  if (action.key !== "invoice-get") throw new Error("key drift");
});
