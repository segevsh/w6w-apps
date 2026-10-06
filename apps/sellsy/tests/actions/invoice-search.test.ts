import action from "../../actions/invoice-search.ts";
import { runCase } from "./_run.ts";

Deno.test("invoice-search: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("invoice-search: is declared with this key", () => {
  if (action.key !== "invoice-search") throw new Error("key drift");
});
