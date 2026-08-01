import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/dashboard-create-update.ts";

const display = { endpoint: "https://example.grafana.net" };

Deno.test("dashboard-create-update: POSTs /dashboards/db with the dashboard body", async () => {
  const { ctx, calls } = mockCtx([{ body: { uid: "new-uid", version: 1, status: "success" } }], {
    display,
  });
  const result = await action.execute(
    { dashboard: { title: "Prod Overview" }, folderUid: "folder-1", message: "initial" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/dashboards/db");
  assertEquals(JSON.parse(calls[0].body!), {
    dashboard: { title: "Prod Overview" },
    folderUid: "folder-1",
    overwrite: false,
    message: "initial",
  });
  assertEquals(result, { uid: "new-uid", version: 1, status: "success" });
});

Deno.test("dashboard-create-update: defaults overwrite to false when omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute({ dashboard: { uid: "existing" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!).overwrite, false);
});

Deno.test("dashboard-create-update: passes overwrite: true through when set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute({ dashboard: { uid: "existing" }, overwrite: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).overwrite, true);
});
