import { assertEquals } from "@std/assert";
import { mockAnalyticsCtx } from "../_helpers.ts";
import action from "../../actions/workspace-users-list.ts";

Deno.test("workspace-users-list: GETs /workspaces/<id>/users with the org header", async () => {
  const { ctx, calls } = mockAnalyticsCtx([
    {
      body: {
        status: "success",
        summary: "Get workspace users",
        data: { users: [{ emailId: "user101@zoho.com", status: true, role: "Account Admin" }] },
      },
    },
  ]);
  const out = await action.execute({ workspaceId: "1", organizationId: "671712892" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/restapi/v2/workspaces/1/users");
  assertEquals(calls[0].headers["zanalytics-orgid"], "671712892");
  assertEquals(out, {
    users: [{ emailId: "user101@zoho.com", status: true, role: "Account Admin" }],
  });
});

Deno.test("workspace-users-list: falls back to the connection's default organization id", async () => {
  const { ctx, calls } = mockAnalyticsCtx(
    [{ body: { status: "success", summary: "ok", data: { users: [] } } }],
    "analyticsapi.zoho.com",
    "671712892",
  );
  await action.execute({ workspaceId: "1" }, ctx);
  assertEquals(calls[0].headers["zanalytics-orgid"], "671712892");
});
