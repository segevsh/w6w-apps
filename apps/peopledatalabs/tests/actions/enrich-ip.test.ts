import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/enrich-ip.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("enrich-ip: GETs /v5/ip/enrich with the ip and the set flags", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: 200, data: { ip: { address: "72.212.42.169" } } },
  }]);
  const out = await action.execute!(
    {
      ip: "72.212.42.169",
      return_person: true,
      return_ip_location: false,
      min_confidence: "high",
    } as never,
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v5/ip/enrich");
  assertEquals(Object.fromEntries(url.searchParams), {
    ip: "72.212.42.169",
    return_person: "true",
    min_confidence: "high",
  });
  assertEquals((out as Record<string, unknown>).found, true);
});

Deno.test("enrich-ip: no ip is refused; 404 is found: false", async () => {
  await assertRejects(
    async () => await action.execute!({} as never, mockCtx([]).ctx),
    Error,
    "ip is required",
  );
  const { ctx } = mockCtx([{ status: 404, body: { status: 404, error: { type: ["not_found"] } } }]);
  const out = await action.execute!({ ip: "10.0.0.1" } as never, ctx) as Record<string, unknown>;
  assertEquals(out.found, false);
});
