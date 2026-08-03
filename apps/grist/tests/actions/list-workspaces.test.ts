import { assertEquals } from "@std/assert";
import { actionCtx } from "../_helpers.ts";
import listWorkspaces from "../../actions/list-workspaces.ts";

Deno.test("list-workspaces: defaults orgId to the literal 'current'", async () => {
  const { ctx, calls } = actionCtx([{ body: [] }]);
  await listWorkspaces.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/orgs/current/workspaces");
});

Deno.test("list-workspaces: blank or whitespace orgId falls back to 'current'", async () => {
  const { ctx, calls } = actionCtx([{ body: [] }, { body: [] }]);
  await listWorkspaces.execute!({ orgId: "" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/orgs/current/workspaces");
  await listWorkspaces.execute!({ orgId: "   " }, ctx);
  assertEquals(new URL(calls[1].url).pathname, "/api/orgs/current/workspaces");
});

Deno.test("list-workspaces: accepts a numeric id or a subdomain", async () => {
  const { ctx, calls } = actionCtx([{ body: [] }, { body: [] }]);
  await listWorkspaces.execute!({ orgId: "42" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/orgs/42/workspaces");
  await listWorkspaces.execute!({ orgId: "gristlabs" }, ctx);
  assertEquals(new URL(calls[1].url).pathname, "/api/orgs/gristlabs/workspaces");
});

Deno.test("list-workspaces: surfaces the docs nested inside each workspace", async () => {
  const { ctx } = actionCtx([{
    body: [{
      id: 155,
      name: "Secret Plans",
      access: "owners",
      docs: [{ id: "9PJhBDZPyCNoayZxaCwFfS", name: "Project Lollipop", isPinned: true }],
    }],
  }]);
  const out = await listWorkspaces.execute!({}, ctx);
  // This inline nesting is the only listing of document ids Grist offers.
  assertEquals(out[0].docs?.[0].id, "9PJhBDZPyCNoayZxaCwFfS");
});
