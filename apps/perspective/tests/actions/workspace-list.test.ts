import { assertEquals } from "@std/assert";
import workspaceList from "../../actions/workspace-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workspace-list: GET /v1/workspaces returns the data array", async () => {
  const ws = [{
    id: "ws_1",
    name: "Main",
    campaigns: [{ id: "fnl_1", name: "F", status: "online" }],
  }];
  const { ctx, calls } = mockCtx([{ body: envelope(ws) }]);
  const out = await workspaceList.execute({}, ctx) as { data: unknown };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/workspaces");
  assertEquals(out.data, ws);
});
