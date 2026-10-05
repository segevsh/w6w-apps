import { assertEquals } from "@std/assert";
import service, { slug, STATUS_URL } from "../health/service.ts";
import { mockCtx } from "./_helpers.ts";

const page = (agg: string, statuses: string[], company = "HoneyBook") => ({
  data: { attributes: { company_name: company, aggregate_state: agg } },
  included: [
    ...statuses.map((s, i) => ({
      type: "status_page_resource",
      attributes: { public_name: `Part ${i} & Co`, status: s },
    })),
    { type: "status_report", attributes: { title: "ignored" } },
  ],
});
const run = (r: Parameters<typeof mockCtx>[0]) => {
  const m = mockCtx(r);
  return { m, p: service.check!({} as never, m.ctx) };
};

Deno.test("health: declared informational, keyless, scoped to the status host", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.honeybook.com"]);
});

Deno.test("health: all operational -> ok, with a component per resource", async () => {
  const { m, p } = run([{ body: page("operational", ["operational", "operational"]) }]);
  const out = await p;
  assertEquals(m.calls[0].url, STATUS_URL);
  assertEquals(out.state, "ok");
  assertEquals(Object.keys(out.components!), ["part-0-co", "part-1-co"]);
});

Deno.test("health: the aggregate is the verdict; affected components are named", async () => {
  const out = await run([{ body: page("downtime", ["operational", "downtime"]) }]).p;
  assertEquals(out.state, "down");
  assertEquals(out.message?.includes("Part 1 & Co: downtime"), true);
});

Deno.test("health: a page that is not HoneyBook's is unknown, not ok", async () => {
  const out = await run([{ body: page("operational", ["operational"], "Zite") }]).p;
  assertEquals(out.state, "unknown");
});

Deno.test("health: failures of the status page itself are unknown, never down", async () => {
  assertEquals((await run([{ status: 503, body: "x" }]).p).state, "unknown");
  assertEquals((await run([{ body: "<html></html>" }]).p).state, "unknown");
  assertEquals((await run([{ body: page("operational", []) }]).p).state, "unknown");
});

Deno.test("health: slug", () => {
  assertEquals(slug("System Access & Stability"), "system-access-stability");
});
