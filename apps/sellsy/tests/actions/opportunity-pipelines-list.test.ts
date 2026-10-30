import { test } from "node:test";
import action from "../../actions/opportunity-pipelines-list.ts";
import { runCase } from "./_run.ts";

test("opportunity-pipelines-list: makes the documented request and returns its result", () =>
  runCase(action));

test("opportunity-pipelines-list: is declared with this key", () => {
  if (action.key !== "opportunity-pipelines-list") throw new Error("key drift");
});
