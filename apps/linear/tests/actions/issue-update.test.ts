import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-update.ts";

Deno.test("issue-update: sends only the fields that were filled in", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { issueUpdate: { success: true } } } }]);
  await action.execute({ issueId: "i1", title: "New", description: "" }, ctx);
  const vars = JSON.parse(calls[0].body!).variables;
  assertEquals(vars.id, "i1");
  assertEquals(vars.input, { title: "New" });
});

Deno.test("issue-update: warns that labelIds replaces rather than appends", () => {
  assert(action.params?.find((p) => p.key === "labelIds")?.hint?.includes("REPLACES"));
});
