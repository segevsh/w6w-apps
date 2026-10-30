import { test } from "node:test";
import action from "../../actions/webhook-create.ts";
import { runCase } from "./_run.ts";

test("webhook-create: makes the documented request and returns its result", () =>
  runCase(action));

test("webhook-create: is declared with this key", () => {
  if (action.key !== "webhook-create") throw new Error("key drift");
});
