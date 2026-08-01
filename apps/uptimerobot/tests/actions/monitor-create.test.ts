import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/monitor-create.ts";

Deno.test("monitor-create: POSTs /newMonitor with required + optional fields mapped to snake_case", async () => {
  const { ctx, calls } = mockCtx([{ body: { stat: "ok", monitor: { id: 777712827 } } }]);
  const out = await action.execute({
    friendlyName: "My Site",
    url: "https://example.com",
    type: 1,
    interval: 300,
    ignoreSslErrors: true,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/newMonitor");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("friendly_name"), "My Site");
  assertEquals(body.get("url"), "https://example.com");
  assertEquals(body.get("type"), "1");
  assertEquals(body.get("interval"), "300");
  assertEquals(body.get("ignore_ssl_errors"), "1");
  assertEquals(out, { id: 777712827 });
});

Deno.test("monitor-create: false ignoreSslErrors is sent as 0, not omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: { stat: "ok", monitor: { id: 1 } } }]);
  await action.execute({
    friendlyName: "X",
    url: "https://x.test",
    type: 1,
    ignoreSslErrors: false,
  }, ctx);
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("ignore_ssl_errors"), "0");
});

Deno.test("monitor-create: port-monitor fields (subType/port) are only sent when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { stat: "ok", monitor: { id: 1 } } }]);
  await action.execute({
    friendlyName: "Port Check",
    url: "1.2.3.4",
    type: 4,
    subType: 99,
    port: 8080,
  }, ctx);
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("sub_type"), "99");
  assertEquals(body.get("port"), "8080");
});
