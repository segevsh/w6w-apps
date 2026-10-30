import { test } from "node:test";
import action from "../../actions/staff-list.ts";
import { runCase } from "./_run.ts";

test("staff-list: makes the documented request and returns its result", () => runCase(action));

test("staff-list: is declared with this key", () => {
  if (action.key !== "staff-list") throw new Error("key drift");
});
