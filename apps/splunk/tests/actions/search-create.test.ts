import { assertEquals } from "@std/assert";
import { mockSplunkCtx } from "../_helpers.ts";
import action from "../../actions/search-create.ts";

Deno.test("search-create: POSTs a form-encoded body to /services/search/jobs", async () => {
  const { ctx, calls } = mockSplunkCtx([{ body: { sid: "123.45" } }]);
  const out = await action.execute(
    { search: "search index=_internal | head 10", earliestTime: "-1h", latestTime: "now" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "acme.splunkcloud.com");
  assertEquals(url.port, "8089");
  assertEquals(url.pathname, "/services/search/jobs");
  assertEquals(url.searchParams.get("output_mode"), "json");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("search"), "search index=_internal | head 10");
  assertEquals(body.get("earliest_time"), "-1h");
  assertEquals(body.get("latest_time"), "now");
  assertEquals(body.get("exec_mode"), "normal");
  assertEquals(out, { sid: "123.45" });
});

Deno.test("search-create: never sets an Authorization header — sign injects it", async () => {
  const { ctx, calls } = mockSplunkCtx([{ body: { sid: "1" } }]);
  await action.execute({ search: "search index=_internal" }, ctx);
  assertEquals("authorization" in calls[0].headers, false);
});
