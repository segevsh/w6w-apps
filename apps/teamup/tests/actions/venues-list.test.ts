import { assertEquals } from "@std/assert";
import { mockCtx, pageEnvelope } from "../_helpers.ts";
import action from "../../actions/venues-list.ts";

const sample = pageEnvelope([{ id: 3, object: "venue" }], 1);

Deno.test("venues-list: reads /venues and passes its filters through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!(
    { status: "active", has_active_sessions: true, page: 2 },
    ctx,
  ) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/venues");
  assertEquals(url.searchParams.get("status"), "active");
  assertEquals(url.searchParams.get("has_active_sessions"), "true");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(result.results.length, 1);
});

Deno.test("venues-list: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});
