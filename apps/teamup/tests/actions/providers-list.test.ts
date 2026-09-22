import { assertEquals } from "@std/assert";
import { mockCtx, pageEnvelope } from "../_helpers.ts";
import action from "../../actions/providers-list.ts";

const sample = pageEnvelope([{ id: 1, object: "provider", name: "Downtown" }], 1);

Deno.test("providers-list: reads /providers and passes its filters through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({ page: 1, page_size: 100 }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/providers");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.get("page_size"), "100");
  assertEquals(result.results.length, 1);
});

Deno.test("providers-list: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});

/** This list is how a caller discovers the ids the other actions accept. */
Deno.test("providers-list: offers the providerId control every action sends as a header", () => {
  const providerId = action.params!.find((p) => p.key === "providerId")!;
  assertEquals(providerId.type, "number");
  assertEquals(providerId.advanced, true);
});
