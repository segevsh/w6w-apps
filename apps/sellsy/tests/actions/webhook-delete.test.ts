import { test } from "node:test";
import action from "../../actions/webhook-delete.ts";
import { runCase } from "./_run.ts";

test("webhook-delete: makes the documented request and returns its result", () =>
  runCase(action));

test("webhook-delete: is declared with this key", () => {
  if (action.key !== "webhook-delete") throw new Error("key drift");
});
