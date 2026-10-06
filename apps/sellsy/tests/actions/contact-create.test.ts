import action from "../../actions/contact-create.ts";
import { runCase } from "./_run.ts";

Deno.test("contact-create: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("contact-create: is declared with this key", () => {
  if (action.key !== "contact-create") throw new Error("key drift");
});
