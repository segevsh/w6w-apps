import { assertEquals } from "@std/assert";
import service, { mapIndicator, STATUS_URL } from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const summary = (indicator: string, name = "RecruitCRM") => ({
  page: { name },
  status: { indicator, description: `desc ${indicator}` },
  components: [],
});

Deno.test("service: is informational, unsigned and scoped to the status host", () => {
  assertEquals(service.severity, "informational");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["status.recruitcrm.io"]);
});

Deno.test("service: maps the page indicator", async () => {
  const cases: Array<[string, string]> = [
    ["none", "ok"],
    ["minor", "degraded"],
    ["major", "degraded"],
    ["maintenance", "degraded"],
    ["critical", "down"],
    ["weird", "unknown"],
  ];
  for (const [indicator, state] of cases) {
    const { ctx, calls } = mockCtx([{ body: summary(indicator) }]);
    const out = await service.check!({} as never, ctx);
    assertEquals(out.state, state, indicator);
    assertEquals(calls[0].url, STATUS_URL);
  }
  assertEquals(mapIndicator(undefined), "unknown");
});

Deno.test("service: a feed with another page name is not trusted", async () => {
  const { ctx } = mockCtx([{ body: summary("none", "Someone Else") }]);
  assertEquals((await service.check!({} as never, ctx)).state, "unknown");
});

Deno.test("service: HTTP errors and non-JSON bodies are unknown, not down", async () => {
  const a = mockCtx([{ status: 503, body: "x" }]);
  assertEquals((await service.check!({} as never, a.ctx)).state, "unknown");
  const b = mockCtx([{ body: "<html>", headers: { "content-type": "text/html" } }]);
  assertEquals((await service.check!({} as never, b.ctx)).state, "unknown");
});
