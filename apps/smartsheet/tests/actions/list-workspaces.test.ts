import { assert, assertEquals } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import action from "../../actions/list-workspaces.ts";

Deno.test("list-workspaces: is a read over the workspace resource", () => {
  assertEquals(action.key, "list-workspaces");
  assertEquals(action.type, "read");
  assertEquals(action.resource, "workspace");
});

Deno.test("list-workspaces: GETs /workspaces with no query by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/2.0/workspaces");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("list-workspaces: is token-paged — maxItems and lastKey, NOT page/pageSize", async () => {
  const keys = (action.params ?? []).map((p) => p.key);
  assertEquals(keys, ["maxItems", "lastKey"]);
  assertEquals(keys.includes("page"), false);
  assertEquals(keys.includes("pageSize"), false);
  assertEquals(keys.includes("includeAll"), false);

  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await action.execute({ maxItems: 500, lastKey: "abc" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("maxItems"), "500");
  assertEquals(q.get("lastKey"), "abc");
});

Deno.test("list-workspaces: states that 100 is the MINIMUM, not just the default", () => {
  assertEquals(param(action, "maxItems").validation?.min, 100);
  assertEquals(param(action, "maxItems").validation?.max, 1000);
  assert(/MINIMUM|minimum/.test(param(action, "maxItems").hint ?? ""));
});

Deno.test("list-workspaces: declares the lastKey cursor in its output", () => {
  const keys = (action.output as Array<{ key: string }>).map((o) => o.key);
  assertEquals(keys, ["data", "lastKey"]);
});
