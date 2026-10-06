import action from "../../actions/opportunity-create.ts";
import { runCase } from "./_run.ts";

Deno.test("opportunity-create: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("opportunity-create: is declared with this key", () => {
  if (action.key !== "opportunity-create") throw new Error("key drift");
});
