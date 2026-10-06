import action from "../../actions/company-contact-link.ts";
import { runCase } from "./_run.ts";

Deno.test("company-contact-link: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("company-contact-link: is declared with this key", () => {
  if (action.key !== "company-contact-link") throw new Error("key drift");
});
