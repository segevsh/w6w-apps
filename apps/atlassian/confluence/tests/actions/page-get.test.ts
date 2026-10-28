import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/page-get.ts";

const display = { site: "acme" };

Deno.test("page-get: asks for the version by default, because page-update needs it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }], { display });
  await action.execute!({ pageId: "1" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/wiki/api/v2/pages/1");
  assertEquals(q.get("include-version"), "true");
  assertEquals(q.get("body-format"), "storage");
});

Deno.test("page-get: an earlier version and labels can be requested", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ pageId: "1", version: 3, includeLabels: true }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("version"), "3");
  assertEquals(q.get("include-labels"), "true");
});

Deno.test("page-get: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`pageId` is required");
  assertEquals(calls.length, 0);
});
