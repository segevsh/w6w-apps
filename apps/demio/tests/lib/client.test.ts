import { assertEquals, assertRejects } from "@std/assert";
import { compact, DemioClient, formatDemioError } from "../../lib/client.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("compact drops undefined, null and empty strings but keeps false and 0", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
});

Deno.test("formatDemioError joins the messages array", () => {
  assertEquals(
    formatDemioError(400, "PUT", "/api/v1/event/register", '{"messages":["a","b"]}'),
    "Demio 400 for PUT /api/v1/event/register: a; b",
  );
  assertEquals(formatDemioError(502, "GET", "/x", "<html>"), "Demio 502 for GET /x: <html>");
});

Deno.test("client: sends JSON accept header, no credential, and builds the query", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new DemioClient(ctx).request("/events", { query: { type: "past", skip: undefined } });
  assertEquals(calls[0].url, `${API_ROOT}/events?type=past`);
  assertEquals(calls[0].headers, { accept: "application/json" });
});

Deno.test("client: a non-2xx throws with the vendor's messages", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { messages: ["Event not found"] } }]);
  await assertRejects(
    () => new DemioClient(ctx).request("/event/9"),
    Error,
    "Event not found",
  );
});
