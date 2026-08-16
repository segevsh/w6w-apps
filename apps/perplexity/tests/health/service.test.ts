import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

/** Shape measured live 2026-08-16: `GET https://status.perplexity.com/v2/components.json`. */
function components(overrides?: Array<{ id: string; name: string; status: string }>) {
  return {
    components: overrides ?? [
      { id: "clyi6jhgg31469ihojbwbsmeeg", name: "Website", status: "OPERATIONAL", group: null },
      { id: "clyiakn7i60113hvojwho6za6j", name: "API", status: "OPERATIONAL", group: null },
      { id: "cmr18ih7201l20rqmap66bx4l", name: "Computer", status: "OPERATIONAL", group: null },
    ],
  };
}

Deno.test("service: probes the status host, unauthenticated and unsigned", () => {
  assertEquals(service.network?.allow, ["status.perplexity.com"]);
  assertEquals(service.credential, "none");
  assertEquals(service.kind, "service");
});

Deno.test("service: an all-operational page reports ok, tracking the API component", async () => {
  const { ctx, calls } = mockCtx([{ body: components() }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, "https://status.perplexity.com/v2/components.json");
  assertEquals(report.state, "ok");
  assertEquals(report.message, undefined);
});

Deno.test("service: reports every component for attribution, keyed by slug", async () => {
  const { ctx } = mockCtx([{ body: components() }]);
  const report = await service.check!({}, ctx);

  assertEquals(Object.keys(report.components ?? {}).sort(), ["api", "computer", "website"]);
});

/**
 * A Website or Computer outage must not degrade the verdict for an app that
 * only calls the chat-completions/search/embeddings API.
 */
Deno.test("service: an outage on Website or Computer does not affect state", async () => {
  const { ctx } = mockCtx([
    {
      body: components([
        { id: "1", name: "Website", status: "MAJOROUTAGE" },
        { id: "2", name: "API", status: "OPERATIONAL" },
        { id: "3", name: "Computer", status: "MAJOROUTAGE" },
      ]),
    },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok");
  assertEquals(report.components?.website.state, "down");
  assertEquals(report.components?.computer.state, "down");
});

Deno.test("service: an API outage reports down and names itself", async () => {
  const { ctx } = mockCtx([
    { body: components([{ id: "2", name: "API", status: "MAJOROUTAGE" }]) },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "down");
  assert(/API is DOWN/.test(report.message ?? ""), report.message);
});

Deno.test("service: a degraded-performance API reports degraded", async () => {
  const { ctx } = mockCtx([
    { body: components([{ id: "2", name: "API", status: "DEGRADEDPERFORMANCE" }]) },
  ]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

/** A broken status page says nothing about Perplexity — never `down`. */
Deno.test("service: a failing status page reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unreadable body reports unknown", async () => {
  const { ctx } = mockCtx([{ body: "<html>not json</html>" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/**
 * Guards against the `/v2/summary.json` trap: that surface answers 200 with
 * only `{"page": {"status": "UP"}}`, no `components` array at all.
 */
Deno.test("service: a page-only payload with no components array reports unknown", async () => {
  const { ctx } = mockCtx([
    { body: { page: { name: "Perplexity", url: "https://status.perplexity.com", status: "UP" } } },
  ]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: if the API component disappears from the feed, reports unknown", async () => {
  const { ctx } = mockCtx([
    { body: components([{ id: "1", name: "Website", status: "OPERATIONAL" }]) },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "unknown");
  assert(/no longer publishes/.test(report.message ?? ""), report.message);
});
