import action from "../../actions/individual-get.ts";
import { runCase } from "./_run.ts";

Deno.test("individual-get: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("individual-get: is declared with this key", () => {
  if (action.key !== "individual-get") throw new Error("key drift");
});
