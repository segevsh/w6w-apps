import action from "../../actions/company-delete.ts";
import { runCase } from "./_run.ts";

Deno.test("company-delete: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("company-delete: is declared with this key", () => {
  if (action.key !== "company-delete") throw new Error("key drift");
});
