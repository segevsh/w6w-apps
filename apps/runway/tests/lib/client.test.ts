import { assertEquals, assertRejects } from "@std/assert";
import {
  compact,
  extraFields,
  jsonInput,
  mediaInput,
  need,
  RunwayClient,
  RunwayError,
  truncate,
  vendorMessage,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: every request carries X-Runway-Version and no credential", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new RunwayClient(ctx).request("/v1/organization");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].method, "GET");
});

Deno.test("client: query drops empty values; a body makes it a JSON POST", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const c = new RunwayClient(ctx);
  await c.request("/v1/voices", { query: { limit: 5, cursor: "", x: undefined } });
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/voices?limit=5");
  await c.request("/v1/uploads", { body: { a: 1 } });
  assertEquals(calls[1].method, "POST");
  assertEquals(calls[1].headers["content-type"], "application/json");
});

Deno.test("client: a 204 yields undefined data; an error throws RunwayError with hint", async () => {
  const ok = mockCtx([{ status: 204 }]);
  assertEquals(
    (await new RunwayClient(ok.ctx).request("/v1/tasks/x", { method: "DELETE" })).data,
    undefined,
  );
  const bad = mockCtx([{ status: 429, body: { error: "slow down" } }]);
  const err = await assertRejects(
    () => new RunwayClient(bad.ctx).request("/v1/text_to_video", { body: {} }),
    RunwayError,
    "slow down",
  );
  assertEquals(err.httpStatus, 429);
  assertEquals(err.message.includes("THROTTLED"), true);
  const text = mockCtx([{
    status: 502,
    headers: { "content-type": "text/html" },
    body: "<html>bad",
  }]);
  await assertRejects(
    () => new RunwayClient(text.ctx).request("/v1/organization"),
    Error,
    "Runway is shedding load",
  );
});

Deno.test("helpers: vendorMessage, truncate, compact, need", () => {
  assertEquals(vendorMessage({ error: "x" }), "x");
  assertEquals(vendorMessage({ error: { message: "y" } }), "y");
  assertEquals(vendorMessage({}), undefined);
  assertEquals(truncate("abcdef", 3).startsWith("abc…"), true);
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
  assertEquals(need(" x ", "n"), "x");
  assertEquals(
    ((): string => {
      try {
        need("", "n");
        return "no";
      } catch (e) {
        return (e as Error).message;
      }
    })(),
    "n is required",
  );
});

Deno.test("helpers: jsonInput, extraFields, mediaInput", () => {
  assertEquals(jsonInput('{"a":1}', "x"), { a: 1 });
  assertEquals(jsonInput({ a: 1 }, "x"), { a: 1 });
  assertEquals(jsonInput("", "x"), undefined);
  assertEquals(
    ((): string => {
      try {
        jsonInput("{", "x");
        return "no";
      } catch (e) {
        return (e as Error).message;
      }
    })(),
    "x must be valid JSON",
  );
  assertEquals(extraFields(undefined), {});
  assertEquals(extraFields('{"k":1}'), { k: 1 });
  assertEquals(mediaInput("https://x.test/a.png"), "https://x.test/a.png");
  assertEquals(mediaInput('[{"uri":"u"}]'), [{ uri: "u" }]);
  assertEquals(mediaInput("  "), undefined);
});
