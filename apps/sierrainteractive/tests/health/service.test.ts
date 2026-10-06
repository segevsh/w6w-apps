import { assertEquals } from "@std/assert";
import service, { PAGE_ID, slug, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const page = (statuses: string[], id = PAGE_ID) => ({
  page: { id, name: "Status Page" },
  components: statuses.map((status, i) => ({ name: `Region ${i}`, status })),
});
const run = (m: ReturnType<typeof mockCtx>) => service.check!({} as never, m.ctx);

Deno.test("service: all regions operational -> ok, with one component per region", async () => {
  const m = mockCtx([{ body: page(["operational", "operational"]) }]);
  const r = await run(m);
  assertEquals(m.calls[0].url, STATUS_URL);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components ?? {}), ["region-0", "region-1"]);
});

Deno.test("service: the verdict is the worst region", async () => {
  assertEquals(
    (await run(mockCtx([{ body: page(["operational", "partial_outage"]) }]))).state,
    "degraded",
  );
  const r = await run(mockCtx([{ body: page(["degraded_performance", "major_outage"]) }]));
  assertEquals(r.state, "down");
  assertEquals(r.message?.includes("Region 1: major_outage"), true);
});

Deno.test("service: wrong page id, bad HTTP, non-JSON and empty pages are unknown", async () => {
  assertEquals((await run(mockCtx([{ body: page(["operational"], "other") }]))).state, "unknown");
  assertEquals((await run(mockCtx([{ status: 500, body: "x" }]))).state, "unknown");
  assertEquals((await run(mockCtx([{ body: "not json" }]))).state, "unknown");
  assertEquals((await run(mockCtx([{ body: page([]) }]))).state, "unknown");
});

Deno.test("service: slug and the status host stay out of the app allowlist", () => {
  assertEquals(slug("US - Northeast Region"), "us-northeast-region");
  assertEquals(service.network?.allow, ["status.sierrainteractive.com"]);
});
