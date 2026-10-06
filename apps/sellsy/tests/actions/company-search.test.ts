import action from "../../actions/company-search.ts";
import { runCase } from "./_run.ts";

Deno.test("company-search: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("company-search: is declared with this key", () => {
  if (action.key !== "company-search") throw new Error("key drift");
});
