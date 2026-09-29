import { assertEquals } from "@std/assert";
import { mockAnalyticsCtx } from "../_helpers.ts";
import action from "../../actions/workspace-get.ts";

Deno.test("workspace-get: GETs /workspaces/<id> with no org header, unwraps the single workspace object", async () => {
  const { ctx, calls } = mockAnalyticsCtx([
    {
      body: {
        status: "success",
        summary: "Get workspace details",
        data: {
          workspaces: {
            workspaceId: "1767024000003145002",
            workspaceName: "Account Details",
            orgId: "671712892",
          },
        },
      },
    },
  ]);
  const out = await action.execute({ workspaceId: "1767024000003145002" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/restapi/v2/workspaces/1767024000003145002");
  assertEquals(calls[0].headers["zanalytics-orgid"], undefined);
  assertEquals(out, {
    workspaceId: "1767024000003145002",
    workspaceName: "Account Details",
    orgId: "671712892",
  });
});
