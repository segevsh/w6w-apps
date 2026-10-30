import { test } from "node:test";
import action from "../../actions/company-contact-link.ts";
import { runCase } from "./_run.ts";

test("company-contact-link: makes the documented request and returns its result", () =>
  runCase(action));

test("company-contact-link: is declared with this key", () => {
  if (action.key !== "company-contact-link") throw new Error("key drift");
});
