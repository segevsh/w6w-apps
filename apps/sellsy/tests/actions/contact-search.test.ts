import action from "../../actions/contact-search.ts";
import { runCase } from "./_run.ts";

Deno.test("contact-search: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("contact-search: is declared with this key", () => {
  if (action.key !== "contact-search") throw new Error("key drift");
});
