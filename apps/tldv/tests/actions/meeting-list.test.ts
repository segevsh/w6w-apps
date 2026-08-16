import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/meeting-list.ts";

const PAGE = { page: 1, pages: 1, total: 1, pageSize: 50, results: [{ id: "m1" }] };

Deno.test("meeting-list: hits GET /meetings with the query params compacted", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await action.execute({
    query: "standup",
    page: 2,
    limit: 25,
    from: "2024-01-01",
    to: "2024-01-31",
    onlyParticipated: true,
    meetingType: "internal",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1alpha1/meetings");
  assertEquals(queryOf(calls[0].url), {
    query: "standup",
    page: "2",
    limit: "25",
    from: "2024-01-01",
    to: "2024-01-31",
    onlyParticipated: "true",
    meetingType: "internal",
  });
  assertEquals(out, PAGE);
});

Deno.test("meeting-list: an empty input sends no query string at all", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("meeting-list: onlyParticipated=false is dropped, matching the API's own default", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await action.execute({ onlyParticipated: false }, ctx);
  assertEquals(queryOf(calls[0].url).onlyParticipated, undefined);
});
