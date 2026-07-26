import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-get.ts";

Deno.test("issue-get: sends the Issue query with the id variable", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { issue: { id: "i1" } } } }]);
  assertEquals(await action.execute({ issueId: "ENG-42" }, ctx), { issue: { id: "i1" } });
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.variables, { id: "ENG-42" });
  assertEquals(sent.query.includes("query Issue"), true);
});
