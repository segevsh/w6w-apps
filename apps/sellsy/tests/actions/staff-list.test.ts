import action from "../../actions/staff-list.ts";
import { runCase } from "./_run.ts";

Deno.test("staff-list: makes the documented request and returns its result", () => runCase(action));

Deno.test("staff-list: is declared with this key", () => {
  if (action.key !== "staff-list") throw new Error("key drift");
});
