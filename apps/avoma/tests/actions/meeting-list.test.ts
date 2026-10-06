import { assert, assertEquals, assertRejects } from "@std/assert";
import meetingList from "../../actions/meeting-list.ts";
import { mockCtx, pageBody, pathOf, queryOf } from "../_helpers.ts";

const WINDOW = { fromDate: "2026-10-01T00:00:00Z", toDate: "2026-10-02T00:00:00Z" };

Deno.test("meeting-list: GET /v1/meetings/ with the required window, trailing slash kept", async () => {
  const { ctx, calls } = mockCtx([{ body: pageBody([{ uuid: "m1" }], { count: 7 }) }]);
  const out = await meetingList.execute({ ...WINDOW, pageSize: 25 }, ctx) as {
    results: unknown[];
    count: number;
    next: string | null;
  };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/meetings/");
  assertEquals(queryOf(calls[0].url), {
    from_date: WINDOW.fromDate,
    to_date: WINDOW.toDate,
    page_size: "25",
  });
  assertEquals(out.results, [{ uuid: "m1" }]);
  assertEquals(out.count, 7);
  assertEquals(out.next, null);
});

Deno.test("meeting-list: filters are mapped to the documented names; lists are comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ body: pageBody([]) }]);
  await meetingList.execute({
    ...WINDOW,
    attendeeEmails: ["a@x.com", " b@x.com "],
    isCall: false,
    isInternal: true,
    recordingDurationGte: 60,
    crmAccountIds: "acc1,acc2",
    includeCrmAssociations: true,
    order: "start_at",
  }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.attendee_emails, "a@x.com,b@x.com");
  assertEquals(q.is_call, "false");
  assertEquals(q.is_internal, "true");
  assertEquals(q.recording_duration__gte, "60");
  assertEquals(q.crm_account_ids, "acc1,acc2");
  assertEquals(q.include_crm_associations, "true");
  assertEquals(q.o, "start_at");
});

Deno.test("meeting-list: a missing date window is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await meetingList.execute({ fromDate: WINDOW.fromDate }, ctx),
    Error,
    "toDate",
  );
  assertEquals(calls.length, 0);
});

Deno.test("meeting-list: a next URL is followed verbatim and needs no window", async () => {
  const next = "https://api.avoma.com/v1/meetings/?page=2&from_date=x&to_date=y";
  const { ctx, calls } = mockCtx([{ body: pageBody([]) }]);
  await meetingList.execute({ next }, ctx);
  assertEquals(calls[0].url, next);
});

Deno.test("meeting-list: a next URL on another host is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await meetingList.execute({ next: "https://evil.example/v1/meetings/?page=2" }, ctx),
    Error,
    "refusing",
  );
  assertEquals(calls.length, 0);
  assert((meetingList.params ?? []).some((p) => p.key === "next"));
});
