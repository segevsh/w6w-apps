import { test } from "node:test";
import action from "../../actions/contact-update.ts";
import { runCase } from "./_run.ts";

test("contact-update: makes the documented request and returns its result", () =>
  runCase(action));

test("contact-update: is declared with this key", () => {
  if (action.key !== "contact-update") throw new Error("key drift");
});
