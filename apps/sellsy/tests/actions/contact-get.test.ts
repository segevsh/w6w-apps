import { test } from "node:test";
import action from "../../actions/contact-get.ts";
import { runCase } from "./_run.ts";

test("contact-get: makes the documented request and returns its result", () =>
  runCase(action));

test("contact-get: is declared with this key", () => {
  if (action.key !== "contact-get") throw new Error("key drift");
});
