import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-get.ts";

Deno.test("project-get: GETs /rest/v1.0/projects/8", async () => {
  const record = { id: 77, name: "x" };
  const { ctx, calls } = mockCtx([{ body: record }]);
  const out = await action.execute!({ "companyId": 5, "projectId": 8 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/rest/v1.0/projects/8");
  assertEquals(url.searchParams.get("company_id"), "5");
  assertEquals(calls[0].headers["procore-company-id"], "5");
  assertEquals(out, record);
});

Deno.test("project-get: surfaces a Procore error", async () => {
  const { ctx } = mockCtx([{ status: 404, statusText: "Not Found", body: { errors: "gone" } }]);
  let message = "";
  try {
    await action.execute!({ "companyId": 5, "projectId": 8 }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("Procore 404"), message);
});
