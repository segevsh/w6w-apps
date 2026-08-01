import { assertEquals } from "@std/assert";
import { mockServiceNowCtx } from "../_helpers.ts";
import instance from "../../health/instance.ts";

Deno.test("instance: unauthenticated 401 is a pass — it proves the instance is serving", async () => {
  const { ctx, calls } = mockServiceNowCtx([{ status: 401, body: {} }]);
  const out = await instance.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(
    calls[0].url,
    "https://acme.service-now.com/api/now/table/sys_user_role?sysparm_limit=1",
  );
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("instance: 404 means the instance is gone", async () => {
  const { ctx } = mockServiceNowCtx([{ status: 404, body: {} }]);
  const out = await instance.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("instance: 5xx is down", async () => {
  const { ctx } = mockServiceNowCtx([{ status: 503, body: {} }]);
  const out = await instance.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("instance: unknown when the connection records no instance", async () => {
  const { ctx } = mockServiceNowCtx([], "");
  const out = await instance.check!({}, ctx);
  assertEquals(out.state, "unknown");
});
