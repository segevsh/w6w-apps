import { assertEquals } from "@std/assert";
import service, { STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const page = (api: string, other = "ok") => ({
  is: "index",
  title: "Short.io Status",
  summaryStatus: "ok",
  systems: [
    { name: "Redirects", status: other },
    { name: "API", status: api },
    { name: "Statistics (EU)", status: "ok" },
  ],
});

Deno.test("service: ok when the API component is ok, fetching the cState index unsigned", async () => {
  const { ctx, calls } = mockCtx([{ body: page("ok") }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(out.components?.["api"].state, "ok");
  assertEquals(Object.keys(out.components!).length, 3);
});

Deno.test("service: verdict follows the API component, not the roll-up or other systems", async () => {
  const a = await service.check!({}, mockCtx([{ body: page("ok", "down") }]).ctx);
  assertEquals(a.state, "ok");
  assertEquals(a.components?.["redirects"].state, "down");
  const b = await service.check!({}, mockCtx([{ body: page("disrupted") }]).ctx);
  assertEquals(b.state, "degraded");
  const c = await service.check!({}, mockCtx([{ body: page("down") }]).ctx);
  assertEquals(c.state, "down");
});

Deno.test("service: unrecognised status becomes unknown, never ok", async () => {
  const out = await service.check!({}, mockCtx([{ body: page("weird") }]).ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: unknown on HTTP failure, HTML body, foreign page, or missing API component", async () => {
  assertEquals(
    (await service.check!({}, mockCtx([{ status: 404, body: "x" }]).ctx)).state,
    "unknown",
  );
  assertEquals(
    (await service.check!({}, mockCtx([{ body: "<html></html>" }]).ctx)).state,
    "unknown",
  );
  const foreign = { ...page("ok"), title: "Other Status" };
  assertEquals((await service.check!({}, mockCtx([{ body: foreign }]).ctx)).state, "unknown");
  const noApi = { ...page("ok"), systems: [{ name: "Redirects", status: "ok" }] };
  assertEquals((await service.check!({}, mockCtx([{ body: noApi }]).ctx)).state, "unknown");
});
