import { assert, assertEquals } from "@std/assert";
import service, { STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const S = service as any;

const summary = (
  comps: Array<{ name: string; status: string; group?: boolean }>,
) => ({
  page: { name: "Drata" },
  components: comps.map((c, i) => ({ id: `c${i}`, ...c })),
});

const all = [
  { name: "Public API US", status: "operational" },
  { name: "API US", status: "operational" },
  { name: "Public API EU", status: "major_outage" },
  { name: "API EU", status: "operational" },
  { name: "Agent API US", status: "major_outage" },
  { name: "US", status: "operational", group: true },
];

Deno.test("service: declares connection scope, context credential and the status host", () => {
  assertEquals(service.scope, "connection");
  assertEquals(service.credential, "context");
  assertEquals(service.network?.allow, ["status.drata.com"]);
});

Deno.test("service: ok for the default region, ignoring other regions and other products", async () => {
  const { ctx, calls } = mockCtx([{ body: summary(all) }]);
  const r = await S.check({}, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components).length, 2);
});

Deno.test("service: the connection's region selects the components (EU outage -> down)", async () => {
  const { ctx } = mockCtx([{ body: summary(all) }], { region: "eu" });
  const r = await S.check({}, ctx);
  assertEquals(r.state, "down");
  assert(r.message.includes("Public API EU: major_outage"), r.message);
});

Deno.test("service: partial outage is degraded", async () => {
  const { ctx } = mockCtx([{
    body: summary([{ name: "Public API US", status: "partial_outage" }]),
  }]);
  assertEquals((await S.check({}, ctx)).state, "degraded");
});

Deno.test("service: a failing page, a wrong shape or missing components is unknown, never down", async () => {
  let m = mockCtx([{ status: 503, body: "x" }]);
  assertEquals((await S.check({}, m.ctx)).state, "unknown");
  m = mockCtx([{ body: { nope: true } }]);
  assertEquals((await S.check({}, m.ctx)).state, "unknown");
  m = mockCtx([{ body: summary([{ name: "Something else", status: "major_outage" }]) }]);
  assertEquals((await S.check({}, m.ctx)).state, "unknown");
});
