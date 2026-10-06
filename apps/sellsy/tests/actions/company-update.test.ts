import action from "../../actions/company-update.ts";
import { runCase } from "./_run.ts";

Deno.test("company-update: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("company-update: is declared with this key", () => {
  if (action.key !== "company-update") throw new Error("key drift");
});
