import { assertEquals } from "@std/assert";
import { mockCtx, pageEnvelope } from "../_helpers.ts";
import action from "../../actions/instructors-list.ts";

const sample = pageEnvelope([{ id: 4, object: "instructor" }], 1);

Deno.test("instructors-list: reads /instructors and passes its filters through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({
    query: "ada",
    events: "8,9",
    offering_type: 3,
    content_collection: 2,
  }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/instructors");
  assertEquals(url.searchParams.get("query"), "ada");
  assertEquals(url.searchParams.get("events"), "8,9");
  assertEquals(url.searchParams.get("offering_type"), "3");
  assertEquals(url.searchParams.get("content_collection"), "2");
  assertEquals(result.results.length, 1);
});

Deno.test("instructors-list: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});
