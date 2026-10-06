import { assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const SUMMARY = { page: { name: "Twist", url: "https://status.twist.io", status: "UP" } };
const comps = (status: string, website = "OPERATIONAL") => ({
  components: [
    { id: "cluqs85cl72335bjod1a9v8ra1", name: "Web application & API", status },
    { id: "clvw42kmz554682bfn2gse0t79a", name: "Website", status: website },
  ],
});

Deno.test("service: reads summary.json and components.json on status.twist.io", async () => {
  const { ctx, calls } = mockCtx([{ body: SUMMARY }, { body: comps("OPERATIONAL") }]);
  const r = await service.check!({}, ctx);
  assertEquals(calls.map((c) => c.url), [
    "https://status.twist.io/summary.json",
    "https://status.twist.io/components.json",
  ]);
  assertEquals(r.state, "ok");
});

Deno.test("service: an API outage maps to down, a partial one to degraded", async () => {
  const major = mockCtx([{ body: SUMMARY }, { body: comps("MAJOROUTAGE") }]);
  const down = await service.check!({}, major.ctx);
  assertEquals(down.state, "down");
  assertEquals(down.components?.["web-application-api"]?.state, "down");
  const partial = mockCtx([{ body: SUMMARY }, { body: comps("PARTIALOUTAGE") }]);
  assertEquals((await service.check!({}, partial.ctx)).state, "degraded");
});

Deno.test("service: a Website-only incident does not move the API verdict", async () => {
  const { ctx } = mockCtx([{ body: SUMMARY }, { body: comps("OPERATIONAL", "MAJOROUTAGE") }]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

Deno.test("service: the component is found by name when its id changes", async () => {
  const { ctx } = mockCtx([{ body: SUMMARY }, {
    body: { components: [{ id: "new-id", name: "Web application & API", status: "MAJOROUTAGE" }] },
  }]);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: a page that is not Twist's is unknown, never trusted", async () => {
  const { ctx, calls } = mockCtx([{ body: { page: { name: "Doist", status: "UP" } } }]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "unknown");
  assertEquals(calls.length, 1);
});

Deno.test("service: without the API component it falls back to the page, capped at degraded", async () => {
  const { ctx } = mockCtx([{ body: { page: { ...SUMMARY.page, status: "HASISSUES" } } }, {
    body: { components: [] },
  }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
  const up = mockCtx([{ body: SUMMARY }, { status: 500, body: "" }]);
  assertEquals((await service.check!({}, up.ctx)).state, "ok");
});

Deno.test("service: a failing status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: declares the status host on its own allowlist, unsigned", () => {
  assertEquals(service.network?.allow, ["status.twist.io"]);
  assertEquals(service.kind, "service");
});
