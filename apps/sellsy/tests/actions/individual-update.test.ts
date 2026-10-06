import action from "../../actions/individual-update.ts";
import { runCase } from "./_run.ts";

Deno.test("individual-update: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("individual-update: is declared with this key", () => {
  if (action.key !== "individual-update") throw new Error("key drift");
});
