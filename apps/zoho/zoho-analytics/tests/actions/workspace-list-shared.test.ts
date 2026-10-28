import { assertEquals } from "@std/assert";
import { mockAnalyticsCtx } from "../_helpers.ts";
import action from "../../actions/workspace-list-shared.ts";

Deno.test("workspace-list-shared: GETs /workspaces/shared with no org header", async () => {
  const { ctx, calls } = mockAnalyticsCtx([
    {
      body: {
        status: "success",
        summary: "Get shared workspaces",
        data: { workspaces: [{ workspaceId: "2", orgId: "67510920" }] },
      },
    },
  ]);
  const out = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/restapi/v2/workspaces/shared");
  assertEquals(calls[0].headers["zanalytics-orgid"], undefined);
  assertEquals(out, { workspaces: [{ workspaceId: "2", orgId: "67510920" }] });
});
