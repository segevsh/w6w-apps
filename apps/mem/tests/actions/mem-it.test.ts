import { assertEquals, assertRejects } from "@std/assert";
import memIt from "../../actions/mem-it.ts";
import { jsonBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = { "input": "Call Sam Friday", "instructions": "file under people" };
const RESPONSE = { "request_id": "r9" };

Deno.test("mem-it: POST /v2/mem-it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  const out = await memIt.execute(INPUT, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/mem-it");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(jsonBody(calls[0]), {
    "input": "Call Sam Friday",
    "instructions": "file under people",
  });
  assertEquals(calls[0].url.startsWith("https://api.mem.ai/"), true);
  assertEquals(out.ok, true);
  assertEquals(out.requestId, "r9");
});

Deno.test("mem-it: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: RESPONSE }]);
  await memIt.execute(INPUT, ctx);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("mem-it: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: {
      error_category: "CLIENT_ERROR",
      error_metadata: { error_kind: "NOT_FOUND", message: "no such thing" },
    },
  }]);
  const err = await assertRejects(() => Promise.resolve(memIt.execute(INPUT, ctx))) as Error;
  assertEquals(err.message.includes("(404)"), true);
  assertEquals(err.message.includes("no such thing"), true);
});
