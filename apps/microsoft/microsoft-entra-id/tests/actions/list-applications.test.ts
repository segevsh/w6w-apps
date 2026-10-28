import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-applications.ts";

Deno.test("list-applications: GETs /applications", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "a1", appId: "c1" }] } }]);
  const out = await action.execute({ top: 50 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1.0/applications");
  assertEquals(url.searchParams.get("$top"), "50");
  assertEquals(out.value.length, 1);
});

Deno.test("list-applications: search is quoted and advanced", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ search: "displayName:Browser" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$search"), '"displayName:Browser"');
  assertEquals(calls[0].headers.consistencylevel, "eventual");
});

Deno.test("list-applications: all=true follows nextLink and stops at maxPages", async () => {
  const next = "https://graph.microsoft.com/v1.0/applications?$skiptoken=2";
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "a" }], "@odata.nextLink": next } },
    { body: { value: [{ id: "b" }], "@odata.nextLink": next } },
  ]);
  const out = await action.execute({ all: true, maxPages: 2 }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.nextLink, next);
});
