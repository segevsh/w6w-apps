import action from "../../actions/contact-update.ts";
import { runCase } from "./_run.ts";

Deno.test("contact-update: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("contact-update: is declared with this key", () => {
  if (action.key !== "contact-update") throw new Error("key drift");
});
