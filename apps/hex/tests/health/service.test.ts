import { assertEquals } from "@std/assert";
import service, { mapComponentStatus, PAGE_ID } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const comp = (name: string, status = "operational", group = false) => ({
  id: name.replace(/\W/g, ""),
  name,
  status,
  group,
});
const summary = (components: unknown[], extra: Record<string, unknown> = {}) => ({
  page: { id: PAGE_ID, name: "Hex", url: "https://status.hex.tech" },
  components,
  incidents: [],
  status: { indicator: "none", description: "All Systems Operational" },
  ...extra,
});
const ALL = ["Data Connections", "Kernels", "Main site", "Login", "Single tenant stacks"];
// deno-lint-ignore no-explicit-any
const run = (ctx: any) => (service as any).check({}, ctx);

Deno.test("service: declared as an app-scoped, credential-less service check", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.hex.tech"]);
});

Deno.test("service: all operational is ok and requests the Statuspage summary", async () => {
  const { ctx, calls } = mockCtx([{ body: summary(ALL.map((n) => comp(n))) }]);
  const r = await run(ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, "https://status.hex.tech/api/v2/summary.json");
  assertEquals(Object.keys(r.components).length, 5);
});

Deno.test("service: a Main site major outage is down", async () => {
  const { ctx } = mockCtx([{
    body: summary(ALL.map((n) => comp(n, n === "Main site" ? "major_outage" : "operational"))),
  }]);
  assertEquals((await run(ctx)).state, "down");
});

Deno.test("service: Kernels and Data Connections are capped at degraded", async () => {
  for (const name of ["Kernels", "Data Connections"]) {
    const { ctx } = mockCtx([{
      body: summary(ALL.map((n) => comp(n, n === name ? "major_outage" : "operational"))),
    }]);
    assertEquals((await run(ctx)).state, "degraded", name);
  }
});

Deno.test("service: Login and Single tenant stacks never decide the verdict", async () => {
  const { ctx } = mockCtx([{
    body: summary(ALL.map((n) => comp(n, /Login|Single/.test(n) ? "major_outage" : "operational"))),
  }]);
  const r = await run(ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.message.includes("Login (major_outage)"), true);
});

Deno.test("service: a page that is not Hex's is unknown", async () => {
  const { ctx } = mockCtx([{
    body: summary(ALL.map((n) => comp(n)), { page: { id: "other", name: "Someone" } }),
  }]);
  assertEquals((await run(ctx)).state, "unknown");
});

Deno.test("service: no recognised components is unknown, not ok", async () => {
  const { ctx } = mockCtx([{ body: summary([comp("Something else")]) }]);
  assertEquals((await run(ctx)).state, "unknown");
});

Deno.test("service: a broken status API is unknown, never down", async () => {
  assertEquals((await run(mockCtx([{ status: 503, body: "x" }]).ctx)).state, "unknown");
  assertEquals((await run(mockCtx([{ body: "<html>" }]).ctx)).state, "unknown");
});

Deno.test("service: mapComponentStatus", () => {
  assertEquals(mapComponentStatus("operational"), "ok");
  assertEquals(mapComponentStatus("partial_outage"), "degraded");
  assertEquals(mapComponentStatus("major_outage"), "down");
  assertEquals(mapComponentStatus("???"), "unknown");
});
