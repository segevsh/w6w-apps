import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

Deno.test("service: reports ok with no components when everything is operational", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: { indicator: "none", description: "All Systems Operational" },
      components: [{ id: "1", name: "Ingest Processor", status: "operational" }],
    },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.message, "All Systems Operational");
  assertEquals(out.components?.["ingest-processor"], { state: "ok" });
  assertEquals(new URL(calls[0].url).hostname, "status.splunkcloud.com");
});

Deno.test("service: maps a major incident on one component to down, without dragging others", async () => {
  const { ctx } = mockCtx([{
    body: {
      status: { indicator: "major", description: "Partial System Outage" },
      components: [
        { id: "1", name: "Ingest Processor", status: "major_outage" },
        { id: "2", name: "Login", status: "operational" },
      ],
    },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "down");
  assertEquals(out.components?.["ingest-processor"], { state: "down" });
  assertEquals(out.components?.["login"], { state: "ok" });
});

Deno.test("service: reports unknown, not down, when the status API itself fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});

Deno.test("service: reports unknown on a malformed body rather than guessing", async () => {
  const { ctx } = mockCtx([{ body: { nonsense: true } }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
});
