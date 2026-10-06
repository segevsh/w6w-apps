import action from "../../actions/webhook-delete.ts";
import { runCase } from "./_run.ts";

Deno.test("webhook-delete: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("webhook-delete: is declared with this key", () => {
  if (action.key !== "webhook-delete") throw new Error("key drift");
});
