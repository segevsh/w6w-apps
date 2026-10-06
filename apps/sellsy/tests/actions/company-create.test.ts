import action from "../../actions/company-create.ts";
import { runCase } from "./_run.ts";

Deno.test("company-create: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("company-create: is declared with this key", () => {
  if (action.key !== "company-create") throw new Error("key drift");
});
