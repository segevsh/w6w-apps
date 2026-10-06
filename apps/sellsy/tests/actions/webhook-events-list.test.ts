import action from "../../actions/webhook-events-list.ts";
import { runCase } from "./_run.ts";

Deno.test("webhook-events-list: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("webhook-events-list: is declared with this key", () => {
  if (action.key !== "webhook-events-list") throw new Error("key drift");
});
