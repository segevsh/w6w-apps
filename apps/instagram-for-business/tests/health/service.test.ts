import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const run = (feed: unknown) => service.check!({ feed } as never, mockCtx().ctx);

Deno.test("health/service: declares the Graph API RSS feed on metastatus.com", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.feed?.url, "https://metastatus.com/outage-events-feed-graph-api.rss");
  assertEquals(service.feed?.format, "rss");
});

Deno.test("health/service: ok when no outage is open", async () => {
  assertEquals((await run({ latest: [] })).state, "ok");
  assertEquals((await run(undefined)).state, "ok");
});

Deno.test("health/service: degraded with the open event titles", async () => {
  const r = await run({ latest: [{ title: "A" }, { title: "B" }] });
  assertEquals(r.state, "degraded");
  assertEquals(r.message, "A; B");
});

Deno.test("health/service: unknown when the feed could not be read", async () => {
  const r = await run({ error: "fetch failed", latest: [] });
  assertEquals(r.state, "unknown");
  assertEquals(r.message, "fetch failed");
});
