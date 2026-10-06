import action from "../../actions/company-get.ts";
import { runCase } from "./_run.ts";

Deno.test("company-get: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("company-get: is declared with this key", () => {
  if (action.key !== "company-get") throw new Error("key drift");
});
