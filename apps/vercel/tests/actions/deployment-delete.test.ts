import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deployment-delete.ts";

Deno.test("deployment-delete: DELETEs and passes the optional url resolver", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { uid: "dpl_1", state: "DELETED" } }], {
    display: {},
  });
  const result = await action.execute!({
    deploymentId: "dpl_1",
    url: "my-app.vercel.app",
  }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v13/deployments/dpl_1");
  assertEquals(new URL(calls[0].url).searchParams.get("url"), "my-app.vercel.app");
  assertEquals(result, { uid: "dpl_1", state: "DELETED" });
});

Deno.test("deployment-delete: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`deploymentId`");
  assertEquals(calls.length, 0);
});
