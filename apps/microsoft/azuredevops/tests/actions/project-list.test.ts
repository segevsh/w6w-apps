import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, list } from "./_shared.ts";
import action from "../../actions/project-list.ts";

Deno.test("project-list: defaults to well-formed projects and returns their names", async () => {
  const { ctx, calls } = mockCtx([list([{ id: "p1", name: "Payments" }])], { display });
  const result = await action.execute!({}, ctx) as { count: number; names: string[] };
  assertEquals(calls[0].url.split("?")[0], "https://dev.azure.com/contoso/_apis/projects");
  assertEquals(new URL(calls[0].url).searchParams.get("stateFilter"), "wellFormed");
  assertEquals(result.count, 1);
  assertEquals(result.names, ["Payments"]);
});

Deno.test("project-list: a project still being created is opt-in", async () => {
  const { ctx, calls } = mockCtx([list([])], { display });
  await action.execute!({ stateFilter: "createPending" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("stateFilter"), "createPending");
});

/** An empty list on a real organization is a scope, not an empty account. */
Deno.test("project-list: says what an empty list actually means", () => {
  assert(/missing Project and Team scope/.test(action.description!), action.description);
});
