import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

/** A Better Stack status payload: aggregate state plus named resources. */
const page = (aggregate: string, resources: Array<[string, string, string?]> = []) => ({
  data: { attributes: { aggregate_state: aggregate } },
  included: [
    { type: "status_page_section", attributes: {} },
    ...resources.map(([public_name, status, explicit_status]) => ({
      type: "status_page_resource",
      attributes: { public_name, status, explicit_status: explicit_status ?? null },
    })),
  ],
});

Deno.test("service: is unsigned and widens egress only to the status host", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["status.tally.so"]);
  // `credential` defaults to "none" for kind "service" — never declared signed.
  assertEquals(service.credential, undefined);
});

Deno.test("service: probes the status page's own JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: page("operational") }]);
  await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.tally.so/index.json");
});

Deno.test("service: an all-clear page reports ok with per-component detail", async () => {
  const { ctx } = mockCtx([
    {
      body: page("operational", [
        ["Tally Application", "operational"],
        ["Tally API", "operational"],
        ["Custom domains", "operational"],
      ]),
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(report.message, "operational");
  assertEquals(report.components?.["tally-api"].state, "ok");
  assertEquals(report.components?.["custom-domains"].state, "ok");
  // The section entry is not a resource and must not become a component.
  assertEquals(Object.keys(report.components ?? {}).length, 3);
});

Deno.test("service: a degraded aggregate reports degraded", async () => {
  const { ctx } = mockCtx([
    { body: page("degraded", [["Tally API", "degraded"], ["Custom domains", "operational"]]) },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assertEquals(report.components?.["tally-api"].state, "degraded");
});

Deno.test("service: downtime maps to down", async () => {
  const { ctx } = mockCtx([{ body: page("downtime", [["Tally API", "downtime"]]) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "down");
  assertEquals(report.components?.["tally-api"].state, "down");
});

Deno.test("service: planned maintenance degrades rather than downs", async () => {
  const { ctx } = mockCtx([{ body: page("maintenance", [["Tally API", "maintenance"]]) }]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: an operator's explicit_status overrides the measured one", async () => {
  const { ctx } = mockCtx([
    { body: page("operational", [["Tally API", "operational", "downtime"]]) },
  ]);
  const report = await service.check!({}, ctx);
  assertEquals(report.components?.["tally-api"].state, "down");
});

Deno.test("service: a failing status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "oops" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unrecognised aggregate reports unknown", async () => {
  const { ctx } = mockCtx([{ body: page("wat") }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unrecognised component state reports unknown for that component", async () => {
  const { ctx } = mockCtx([{ body: page("operational", [["Tally API", "wat"]]) }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.components?.["tally-api"].state, "unknown");
});
