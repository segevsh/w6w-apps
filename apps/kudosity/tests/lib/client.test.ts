import { assertEquals, assertRejects } from "@std/assert";
import { compact, encodeId, formatError, KudosityClient } from "../../lib/client.ts";
import { API_ROOT, mockCtx, problem, queryOf } from "../_helpers.ts";

Deno.test("formatError: reads all three error shapes", () => {
  assertEquals(formatError(404, { error: "not found" }), "HTTP 404: not found");
  assertEquals(formatError(401, { status: "Unauthorized" }), "HTTP 401: Unauthorized");
  assertEquals(
    formatError(
      400,
      problem(400, "Invalid Request", "Request validation failed", [{
        name: "sender",
        message: "is required",
      }]),
    ),
    "HTTP 400: Invalid Request: Request validation failed (sender is required)",
  );
  assertEquals(formatError(502, null), "HTTP 502");
});

Deno.test("compact / encodeId", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: null, e: [], f: false }), {
    a: 1,
    f: false,
  });
  assertEquals(encodeId(" a/b "), "a%2Fb");
});

Deno.test("client: url repeats array query keys and skips empty values", () => {
  const { ctx } = mockCtx();
  const url = new KudosityClient(ctx).url("/sms", { a: ["x", "y"], b: "", c: undefined, d: 3 });
  assertEquals(url, `${API_ROOT}/sms?a=x&a=y&d=3`);
  assertEquals(queryOf(url).getAll("a"), ["x", "y"]);
});

Deno.test("client: a non-2xx throws with the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: "SMS not found" } }]);
  await assertRejects(
    () => new KudosityClient(ctx).json("/sms/x"),
    Error,
    "HTTP 404: SMS not found",
  );
});

Deno.test("client: data() unwraps the envelope and returns meta", async () => {
  const { ctx } = mockCtx([{ body: { data: { a: 1 }, meta: { m: 2 } } }]);
  assertEquals(await new KudosityClient(ctx).data("/x"), { data: { a: 1 }, meta: { m: 2 } });
});

Deno.test("client: never sends credentials itself", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new KudosityClient(ctx).json("/sms");
  assertEquals("x-api-key" in calls[0].headers, false);
  assertEquals("authorization" in calls[0].headers, false);
});
