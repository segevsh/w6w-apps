import { assert, assertEquals } from "@std/assert";
import listWhosOut from "../../actions/list-whos-out.ts";
import { mockCtx, param } from "../_helpers.ts";

Deno.test("list-whos-out: searches /time_off/whos_out with no required params", async () => {
  assertEquals(listWhosOut.type, "search");
  assertEquals((listWhosOut.params ?? []).filter((p) => p.required).length, 0);

  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listWhosOut.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/time_off/whos_out");
  // A bare call must send no params at all — the API's own defaults (today,
  // +14 days) are the right ones.
  assertEquals(url.search, "");
});

Deno.test("list-whos-out: a date range passes through", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await listWhosOut.execute({ start: "2026-09-01", end: "2026-09-30" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("start"), "2026-09-01");
  assertEquals(q.get("end"), "2026-09-30");
});

Deno.test("list-whos-out: the boolean sends the documented `filter=off`, and only when true", async () => {
  // The param is the REVERSE of what `filter` suggests: omitting it APPLIES the
  // key holder's saved calendar filter; `off` bypasses it and widens the result.
  const { ctx, calls } = mockCtx([{ body: [] }, { body: [] }]);
  await listWhosOut.execute({ filter: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("filter"), "off");

  await listWhosOut.execute({ filter: false }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.has("filter"), false);
});

Deno.test("list-whos-out: the param is labelled for what it does, not for the wire name", () => {
  const p = param(listWhosOut, "filter");
  assertEquals(p.type, "boolean");
  assert(/ignore|bypass/i.test(`${p.label} ${p.hint}`));
});
