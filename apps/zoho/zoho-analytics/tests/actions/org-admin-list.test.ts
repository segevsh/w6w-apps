import { assertEquals } from "@std/assert";
import { mockAnalyticsCtx } from "../_helpers.ts";
import action from "../../actions/org-admin-list.ts";

Deno.test("org-admin-list: GETs /orgadmins with the org header", async () => {
  const { ctx, calls } = mockAnalyticsCtx([
    {
      body: {
        status: "success",
        summary: "Get org admins",
        data: { orgAdmins: ["user+1@zoho.com", "user+2@zoho.com"] },
      },
    },
  ]);
  const out = await action.execute({ organizationId: "671712892" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/restapi/v2/orgadmins");
  assertEquals(calls[0].headers["zanalytics-orgid"], "671712892");
  assertEquals(out, { orgAdmins: ["user+1@zoho.com", "user+2@zoho.com"] });
});

Deno.test("org-admin-list: falls back to the connection's default organization id", async () => {
  const { ctx, calls } = mockAnalyticsCtx(
    [{ body: { status: "success", summary: "ok", data: { orgAdmins: [] } } }],
    "analyticsapi.zoho.com",
    "671712892",
  );
  await action.execute({}, ctx);
  assertEquals(calls[0].headers["zanalytics-orgid"], "671712892");
});
