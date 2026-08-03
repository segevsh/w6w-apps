import { assertEquals } from "@std/assert";
import { mockCtx, outputKeys, page } from "../_helpers.ts";
import action from "../../actions/meeting-get-many.ts";

Deno.test("meeting-get-many: GETs /meetings mapping every filter to its documented name", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ recording_id: 123456789 }], "cur2", 10) }]);
  const result = await action.execute({
    cursor: "cur1",
    createdAfter: "2025-01-01T00:00:00Z",
    createdBefore: "2025-02-01T00:00:00Z",
    recordedBy: ["ceo@acme.com", "pm@acme.com"],
    teams: ["Sales", "Engineering"],
    meetingType: "Quarterly Business Review",
    calendarInviteesDomains: ["acme.com"],
    calendarInviteesDomainsType: "one_or_more_external",
    includeTranscript: true,
    includeSummary: true,
    includeActionItems: true,
    includeHighlights: true,
    includeCrmMatches: true,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/external/v1/meetings");
  assertEquals(url.searchParams.get("cursor"), "cur1");
  assertEquals(url.searchParams.get("created_after"), "2025-01-01T00:00:00Z");
  assertEquals(url.searchParams.get("created_before"), "2025-02-01T00:00:00Z");
  assertEquals(url.searchParams.getAll("recorded_by[]"), ["ceo@acme.com", "pm@acme.com"]);
  assertEquals(url.searchParams.getAll("teams[]"), ["Sales", "Engineering"]);
  assertEquals(url.searchParams.get("meeting_type"), "Quarterly Business Review");
  assertEquals(url.searchParams.getAll("calendar_invitees_domains[]"), ["acme.com"]);
  assertEquals(url.searchParams.get("calendar_invitees_domains_type"), "one_or_more_external");
  assertEquals(url.searchParams.get("include_transcript"), "true");
  assertEquals(url.searchParams.get("include_summary"), "true");
  assertEquals(url.searchParams.get("include_action_items"), "true");
  assertEquals(url.searchParams.get("include_highlights"), "true");
  assertEquals(url.searchParams.get("include_crm_matches"), "true");

  assertEquals(result, {
    items: [{ recording_id: 123456789 }],
    nextCursor: "cur2",
    limit: 10,
  });
});

Deno.test("meeting-get-many: sends no query at all when nothing is set", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("meeting-get-many: is a search action with cursor paging declared", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "meeting");
  assertEquals(action.params?.some((p) => p.key === "cursor"), true);
  assertEquals(outputKeys(action), ["items", "nextCursor", "limit"]);
});

Deno.test("meeting-get-many: the heavy include flags default to off", () => {
  for (const key of ["includeTranscript", "includeSummary"]) {
    assertEquals(action.params?.find((p) => p.key === key)?.default, false, key);
  }
});
