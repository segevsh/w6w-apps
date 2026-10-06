import { assertEquals } from "@std/assert";
import service, {
  COMPONENT_ID,
  COMPONENT_NAME,
  COMPONENT_STATE,
  STATUS_URL,
} from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const components = (status: string, other = "OPERATIONAL") => ({
  components: [
    { id: "clxu9niyv15376b7n1wa6n51d1", name: "App Store", status: other },
    { id: COMPONENT_ID, name: COMPONENT_NAME, status },
    { id: "cm3iaywog0045iiles2t76jhr", name: "Store APIs", status: other },
  ],
});

Deno.test("service: reads the Instatus components feed, unsigned, on its own host only", () => {
  assertEquals(STATUS_URL, "https://status.salla.com/components.json");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.salla.com"]);
});

Deno.test("COMPONENT_STATE: covers the Instatus vocabulary (no underscores)", () => {
  assertEquals(COMPONENT_STATE["OPERATIONAL"], "ok");
  assertEquals(COMPONENT_STATE["UNDERMAINTENANCE"], "degraded");
  assertEquals(COMPONENT_STATE["DEGRADEDPERFORMANCE"], "degraded");
  assertEquals(COMPONENT_STATE["PARTIALOUTAGE"], "degraded");
  assertEquals(COMPONENT_STATE["MAJOROUTAGE"], "down");
});

Deno.test("service: operational Merchant APIs reports ok", async () => {
  const { ctx, calls } = mockCtx([{ body: components("OPERATIONAL") }]);
  const r = await service.check!({} as never, ctx);
  assertEquals(calls[0].url, STATUS_URL);
  assertEquals(r.state, "ok");
  assertEquals(Object.keys(r.components!), [COMPONENT_ID]);
});

Deno.test("service: each non-operational status maps to its state", async () => {
  for (
    const [status, state] of [
      ["DEGRADEDPERFORMANCE", "degraded"],
      ["PARTIALOUTAGE", "degraded"],
      ["UNDERMAINTENANCE", "degraded"],
      ["MAJOROUTAGE", "down"],
    ]
  ) {
    const { ctx } = mockCtx([{ body: components(status) }]);
    const r = await service.check!({} as never, ctx);
    assertEquals(r.state, state, status);
    assertEquals(r.message, `Merchant APIs: ${status}`);
  }
});

Deno.test("service: an unrelated component being down does not affect the verdict", async () => {
  const { ctx } = mockCtx([{ body: components("OPERATIONAL", "MAJOROUTAGE") }]);
  assertEquals((await service.check!({} as never, ctx)).state, "ok");
});

Deno.test("service: an unknown status string is unknown, never ok", async () => {
  const { ctx } = mockCtx([{ body: components("SOMETHINGNEW") }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});

Deno.test("service: a missing or renamed component is unknown", async () => {
  const a = mockCtx([{
    body: { components: [{ id: "x", name: "Store APIs", status: "OPERATIONAL" }] },
  }]);
  assertEquals((await service.check!({} as never, a.ctx)).state, "unknown");
  const b = mockCtx([{
    body: { components: [{ id: COMPONENT_ID, name: "Something else", status: "OPERATIONAL" }] },
  }]);
  assertEquals((await service.check!({} as never, b.ctx)).state, "unknown");
});

Deno.test("service: a failing or unreadable status API is unknown, never down", async () => {
  const a = mockCtx([{ status: 500, body: "boom" }]);
  assertEquals((await service.check!({} as never, a.ctx)).state, "unknown");
  const b = mockCtx([{ body: "<html>shell</html>" }]);
  assertEquals((await service.check!({} as never, b.ctx)).state, "unknown");
  const c = mockCtx([{ body: { page: { status: "UP" } } }]);
  assertEquals((await service.check!({} as never, c.ctx)).state, "unknown");
});
