import { test } from "node:test";
import action from "../../actions/contact-create.ts";
import { runCase } from "./_run.ts";

test("contact-create: makes the documented request and returns its result", () =>
  runCase(action));

test("contact-create: is declared with this key", () => {
  if (action.key !== "contact-create") throw new Error("key drift");
});
