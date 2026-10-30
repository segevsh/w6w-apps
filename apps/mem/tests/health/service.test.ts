import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import service, { mapComponentStatus, PAGE_ID, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const summary = (status: string, id = PAGE_ID) => ({
  page: { id, name: "Mem" },
  status: { indicator: "none" },
  components: [{ id: "c1", name: "API", status }],
});
// deno-lint-ignore no-explicit-any
const run = (ctx: any) => service.check!({} as never, ctx) as Promise<Record<string, any>>;

test("service: operational maps to ok and calls the summary URL", async () => {
  const { ctx, calls } = mockCtx([{ body: summary("operational") }]);
  const r = await run(ctx);
  assertEquals(r.state, "ok");
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(calls[0].headers.authorization, undefined);
});

test("service: outage and degradation map through", async () => {
  assertEquals((await run(mockCtx([{ body: summary("major_outage") }]).ctx)).state, "down");
  const r = await run(mockCtx([{ body: summary("partial_outage") }]).ctx);
  assertEquals(r.state, "degraded");
  assertEquals(r.message, "API: partial_outage");
});

test("service: an unrecognized status is unknown, not guessed", () => {
  assertEquals(mapComponentStatus("weird"), "unknown");
});

test("service: a page that is not Mem's, a missing component, or an HTTP failure is unknown", async () => {
  assertEquals(
    (await run(mockCtx([{ body: summary("operational", "other") }]).ctx)).state,
    "unknown",
  );
  const none = { page: { id: PAGE_ID }, components: [] };
  assertEquals((await run(mockCtx([{ body: none }]).ctx)).state, "unknown");
  assertEquals((await run(mockCtx([{ status: 503, body: {} }]).ctx)).state, "unknown");
  assertEquals((await run(mockCtx([{ body: "<html>" }]).ctx)).state, "unknown");
});

test("service: declares its own host and no credential", () => {
  assertEquals(service.network?.allow, ["status.mem.ai"]);
  assertEquals(service.credential, "none");
});
