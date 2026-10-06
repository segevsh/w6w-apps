import { assertEquals, assertRejects } from "@std/assert";
import { BASE, CONN, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-applications.ts";

Deno.test("list-applications: sends only the filters that were set, under the documented names", async () => {
  const body = {
    api_id: "a",
    meta: { limit: 5, offset: 0, total_count: 0, next: null },
    objects: [],
  };
  const { ctx, calls } = mockCtx([{ body }], CONN);
  const out = await action.execute!(
    { appName: "IVR", subaccount: "SA1", limit: 1, offset: 1 },
    ctx,
  );
  assertEquals(calls[0].method, "GET");
  const u = new URL(calls[0].url);
  assertEquals(u.origin + u.pathname, BASE + "Application/");
  assertEquals(Object.fromEntries(u.searchParams), {
    app_name: "IVR",
    subaccount: "SA1",
    limit: "1",
    offset: "1",
  });
  assertEquals(out, body);
});

Deno.test("list-applications: no input means no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { objects: [] } }], CONN);
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, BASE + "Application/");
});

Deno.test("list-applications: a 401 plain-text body is thrown with its text", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Could not verify your access level" }], CONN);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "Could not verify your access level",
  );
});
