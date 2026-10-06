import { assert, assertEquals } from "@std/assert";
import evaluations from "../../actions/scorecard-evaluation-list.ts";
import { mockCtx, pageBody } from "../_helpers.ts";

Deno.test("scorecard-evaluation-list: array filters go out as repeated keys, not comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ body: pageBody([{ uuid: "ev1" }]) }]);
  const out = await evaluations.execute({
    scorecardUuids: "s1, s2",
    userEmails: ["a@x.com", "b@x.com"],
    meetingUuid: "m1",
    pageSize: 10,
  }, ctx) as { results: unknown[] };
  const u = new URL(calls[0].url);
  assertEquals(u.pathname, "/v1/scorecard_evaluations/");
  assertEquals(u.searchParams.getAll("scorecard_uuids"), ["s1", "s2"]);
  assertEquals(u.searchParams.getAll("user_emails"), ["a@x.com", "b@x.com"]);
  assertEquals(u.searchParams.get("meeting_uuid"), "m1");
  assertEquals(u.searchParams.get("page_size"), "10");
  assertEquals(out.results.length, 1);
  assert(!u.searchParams.has("from_date"));
});

Deno.test("scorecard-evaluation-list: the date window is optional here", async () => {
  const { ctx, calls } = mockCtx([{ body: pageBody([]) }]);
  await evaluations.execute({}, ctx);
  assertEquals(calls.length, 1);
});
