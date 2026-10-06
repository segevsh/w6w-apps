import action from "../../actions/comment-create.ts";
import { runCase } from "./_run.ts";

Deno.test("comment-create: makes the documented request and returns its result", () =>
  runCase(action));

Deno.test("comment-create: is declared with this key", () => {
  if (action.key !== "comment-create") throw new Error("key drift");
});
