import { assertEquals } from "@std/assert";
import workspaceCreate from "../../actions/workspace-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workspace-create: POST /workspaces with the name, returns the 201 body", async () => {
  const created = { id: "w2", name: "Client", plan: "FREE", submissionsQuota: 250 };
  const { ctx, calls } = mockCtx([{ status: 201, body: created }]);
  const out = await workspaceCreate.execute({ name: "Client" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/public/v1/workspaces");
  assertEquals(JSON.parse(calls[0].body!), { name: "Client" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(out, created);
});

Deno.test("workspace-create: is declared non-idempotent", () => {
  assertEquals(workspaceCreate.idempotent, false);
});
