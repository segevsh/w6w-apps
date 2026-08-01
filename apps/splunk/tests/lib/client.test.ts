import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockSplunkCtx } from "../_helpers.ts";
import { baseUrl, SplunkClient, stackFromConnection, unset } from "../../lib/client.ts";

Deno.test("client: builds the URL from the connection's stack, not a param, on port 8089", async () => {
  const { ctx, calls } = mockSplunkCtx([{ body: { entry: [] } }], "acme.splunkcloud.com");
  await new SplunkClient(ctx).request("/services/data/indexes");
  assertEquals(
    calls[0].url,
    "https://acme.splunkcloud.com:8089/services/data/indexes?output_mode=json",
  );
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: fails loudly when the connection carries no stack", () => {
  const { ctx } = mockCtx();
  assertThrows(() => new SplunkClient(ctx), Error, "no stack");
});

Deno.test("client: sends form bodies as application/x-www-form-urlencoded, not JSON", async () => {
  const { ctx, calls } = mockSplunkCtx([{ body: { sid: "1" } }]);
  await new SplunkClient(ctx).request("/services/search/jobs", {
    method: "POST",
    form: { search: "search index=_internal" },
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(calls[0].body, "search=search+index%3D_internal");
});

Deno.test("client: surfaces Splunk's error body", async () => {
  const { ctx } = mockSplunkCtx([{
    status: 400,
    statusText: "Bad Request",
    body: '{"messages":[{"type":"FATAL","text":"Unknown search command"}]}',
  }]);
  await assertRejects(
    () => new SplunkClient(ctx).request("/services/search/jobs", { method: "POST", form: {} }),
    Error,
    "Unknown search command",
  );
});

Deno.test("client: returns undefined for a 204", async () => {
  const { ctx } = mockSplunkCtx([{ status: 204 }]);
  assertEquals(
    await new SplunkClient(ctx).request("/services/search/jobs/1", { method: "DELETE" }),
    undefined,
  );
});

Deno.test("stackFromConnection: reads the display data afterConnect records", () => {
  assertEquals(
    stackFromConnection({ display: { stack: "acme.splunkcloud.com" } } as never),
    "acme.splunkcloud.com",
  );
  assertThrows(() => stackFromConnection(undefined), Error, "no stack");
});

Deno.test("baseUrl: builds the per-stack host on port 8089", () => {
  assertEquals(baseUrl("acme.splunkcloud.com"), "https://acme.splunkcloud.com:8089");
});

Deno.test("unset: treats a blank string as absent", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});
