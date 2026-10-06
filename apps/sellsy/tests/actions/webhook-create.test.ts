import action from "../../actions/webhook-create.ts";
import { runCase } from "./_run.ts";

Deno.test("webhook-create: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("webhook-create: is declared with this key", () => {
  if (action.key !== "webhook-create") throw new Error("key drift");
});
