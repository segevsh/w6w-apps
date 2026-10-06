import action from "../../actions/webhook-list.ts";
import { runCase } from "./_run.ts";

Deno.test("webhook-list: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("webhook-list: is declared with this key", () => {
  if (action.key !== "webhook-list") throw new Error("key drift");
});
