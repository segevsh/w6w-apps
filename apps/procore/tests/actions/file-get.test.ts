import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/file-get.ts";

test("file-get: GETs /rest/v1.0/files/77", async () => {
  const record = { id: 77, name: "x" };
  const { ctx, calls } = mockCtx([{ body: record }]);
  const out = await action.execute!({
    "companyId": 5,
    "projectId": 8,
    "fileId": 77,
    "latestVersionOnly": true,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/rest/v1.0/files/77");
  assertEquals(url.searchParams.get("project_id"), "8");
  assertEquals(url.searchParams.get("show_latest_version_only"), "true");
  assertEquals(calls[0].headers["procore-company-id"], "5");
  assertEquals(out, record);
});

test("file-get: surfaces a Procore error", async () => {
  const { ctx } = mockCtx([{ status: 404, statusText: "Not Found", body: { errors: "gone" } }]);
  let message = "";
  try {
    await action.execute!({
      "companyId": 5,
      "projectId": 8,
      "fileId": 77,
      "latestVersionOnly": true,
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("Procore 404"), message);
});
