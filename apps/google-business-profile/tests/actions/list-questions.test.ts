import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-questions.ts";

Deno.test("list-questions: GETs /v1/locations/{id}/questions with default answersPerQuestion", async () => {
  const body = { questions: [{ name: "locations/1/questions/2" }], totalSize: 1 };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ locationId: "1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.host, "mybusinessqanda.googleapis.com");
  assertEquals(url.pathname, "/v1/locations/1/questions");
  assertEquals(url.searchParams.get("answersPerQuestion"), "10");
  assertEquals(result, body);
});

Deno.test("list-questions: ignoreAnswered sets the documented filter string", async () => {
  const { ctx, calls } = mockCtx([{ body: { questions: [] } }]);
  await action.execute!({ locationId: "1", ignoreAnswered: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("filter"), "ignore_answered=true");
});

Deno.test("list-questions: omits the filter when ignoreAnswered is false", async () => {
  const { ctx, calls } = mockCtx([{ body: { questions: [] } }]);
  await action.execute!({ locationId: "1", ignoreAnswered: false }, ctx);
  assert(!new URL(calls[0].url).searchParams.has("filter"));
});

Deno.test("list-questions: forwards orderBy and paging", async () => {
  const { ctx, calls } = mockCtx([{ body: { questions: [] } }]);
  await action.execute!({
    locationId: "1",
    orderBy: "upvote_count desc",
    pageSize: 5,
    pageToken: "next",
  }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("orderBy"), "upvote_count desc");
  assertEquals(params.get("pageSize"), "5");
  assertEquals(params.get("pageToken"), "next");
});
