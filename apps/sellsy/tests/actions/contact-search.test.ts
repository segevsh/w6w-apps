import { test } from "node:test";
import action from "../../actions/contact-search.ts";
import { runCase } from "./_run.ts";

test("contact-search: makes the documented request and returns its result", () =>
  runCase(action));

test("contact-search: is declared with this key", () => {
  if (action.key !== "contact-search") throw new Error("key drift");
});
