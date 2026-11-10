import { describe, test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, type MockResponse } from "../_helpers.ts";
import newOrUpdatedDatabasePage from "../../triggers/new-or-updated-database-page.ts";
import newOrUpdatedPage from "../../triggers/new-or-updated-page.ts";
import newOrUpdatedDataSource from "../../triggers/new-or-updated-data-source.ts";
import newOrUpdatedDatabase from "../../triggers/new-or-updated-database.ts";
import newFileUpload from "../../triggers/new-file-upload.ts";
import newAgent from "../../triggers/new-agent.ts";
import newSession from "../../triggers/new-session.ts";
import newOrUpdatedSession from "../../triggers/new-or-updated-session.ts";
import newSessionEvent from "../../triggers/new-session-event.ts";
import newMeetingNote from "../../triggers/new-meeting-note.ts";
import newOrUpdatedMeetingNote from "../../triggers/new-or-updated-meeting-note.ts";

type Item = Record<string, unknown>;
const list = (items: Item[]): MockResponse => ({
  body: { object: "list", results: items, next_cursor: null, has_more: false },
});

interface Literal {
  method: string;
  path: string;
  search?: string;
  body?: unknown;
}

interface Case {
  trigger: typeof newAgent;
  params: Record<string, unknown>;
  /** First request(s) of a check: the list call (+ any follow-up call the action makes). */
  literal: Literal;
  item: (id: string, stamp?: string) => Item;
  /** Fixed stamp field name when the id embeds an edit stamp (new-or-updated). */
  stamp?: string;
  /** Wrap the list response for a check (search-databases resolves containers with a GET). */
  respond?: (items: Item[]) => MockResponse[];
  /** The follow-up literal calls after the list call, in order. */
  followUps?: (items: Item[]) => Literal[];
}

const SORT_EDITED = { direction: "descending", timestamp: "last_edited_time" };

const CASES: Case[] = [
  {
    trigger: newOrUpdatedDatabasePage as never,
    params: { dataSourceId: "ds-1" },
    literal: {
      method: "POST",
      path: "/v1/data_sources/ds-1/query",
      body: { sorts: [{ timestamp: "last_edited_time", direction: "descending" }], page_size: 25 },
    },
    item: (id, t = "2026-11-10T08:00:00.000Z") => ({ object: "page", id, last_edited_time: t }),
    stamp: "last_edited_time",
  },
  {
    trigger: newOrUpdatedPage as never,
    params: {},
    literal: {
      method: "POST",
      path: "/v1/search",
      body: { sort: SORT_EDITED, page_size: 25, filter: { property: "object", value: "page" } },
    },
    item: (id, t = "2026-11-10T08:00:00.000Z") => ({ object: "page", id, last_edited_time: t }),
    stamp: "last_edited_time",
  },
  {
    trigger: newOrUpdatedDataSource as never,
    params: {},
    literal: {
      method: "POST",
      path: "/v1/search",
      body: {
        sort: SORT_EDITED,
        page_size: 25,
        filter: { property: "object", value: "data_source" },
      },
    },
    item: (id, t = "2026-11-10T08:00:00.000Z") => ({
      object: "data_source",
      id,
      last_edited_time: t,
    }),
    stamp: "last_edited_time",
  },
  {
    trigger: newOrUpdatedDatabase as never,
    params: {},
    literal: {
      method: "POST",
      path: "/v1/search",
      body: {
        sort: SORT_EDITED,
        page_size: 25,
        filter: { property: "object", value: "data_source" },
      },
    },
    // search answers data sources; the app then GETs each parent database
    item: (id, t = "2026-11-10T08:00:00.000Z") => ({
      object: "database",
      id,
      last_edited_time: t,
    }),
    stamp: "last_edited_time",
    respond: (items) => [
      list(
        items.map((i) => ({
          object: "data_source",
          id: `ds-${i.id}`,
          parent: { database_id: i.id },
        })),
      ),
      ...items.map((i): MockResponse => ({ body: i })),
    ],
    followUps: (items) => items.map((i) => ({ method: "GET", path: `/v1/databases/${i.id}` })),
  },
  {
    trigger: newFileUpload as never,
    params: {},
    literal: { method: "GET", path: "/v1/file_uploads", search: "page_size=25" },
    item: (id) => ({ object: "file_upload", id, status: "uploaded" }),
  },
  {
    trigger: newAgent as never,
    params: {},
    literal: {
      method: "POST",
      path: "/v1/agents/query",
      body: { sorts: [{ property: "created_time", direction: "descending" }], page_size: 25 },
    },
    item: (id) => ({ object: "agent", id, name: "Agent" }),
  },
  {
    trigger: newSession as never,
    params: {},
    literal: {
      method: "POST",
      path: "/v1/sessions/query",
      body: { sorts: [{ property: "created_at", direction: "descending" }], page_size: 25 },
    },
    item: (id) => ({ object: "session", id, status: "idle" }),
  },
  {
    trigger: newOrUpdatedSession as never,
    params: {},
    literal: {
      method: "POST",
      path: "/v1/sessions/query",
      body: { sorts: [{ property: "updated_at", direction: "descending" }], page_size: 25 },
    },
    item: (id, t = "2026-11-10T08:00:00.000Z") => ({ object: "session", id, updated_at: t }),
    stamp: "updated_at",
  },
  {
    trigger: newSessionEvent as never,
    params: { sessionId: "sess-1" },
    literal: {
      method: "POST",
      path: "/v1/sessions/sess-1/events/query",
      body: { sorts: [{ property: "sequence", direction: "descending" }], page_size: 25 },
    },
    item: (id) => ({ object: "session_event", id, session_id: "sess-1" }),
  },
  {
    trigger: newMeetingNote as never,
    params: {},
    literal: {
      method: "POST",
      path: "/v1/blocks/meeting_notes/query",
      body: { sort: [{ property: "created_time", direction: "descending" }], limit: 25 },
    },
    item: (id) => ({ object: "block", id, type: "meeting_notes" }),
  },
  {
    trigger: newOrUpdatedMeetingNote as never,
    params: {},
    literal: {
      method: "POST",
      path: "/v1/blocks/meeting_notes/query",
      body: { sort: [{ property: "last_edited_time", direction: "descending" }], limit: 25 },
    },
    item: (id, t = "2026-11-10T08:00:00.000Z") => ({
      object: "block",
      id,
      type: "meeting_notes",
      last_edited_time: t,
    }),
    stamp: "last_edited_time",
  },
];

function responsesFor(c: Case, items: Item[]): MockResponse[] {
  return c.respond ? c.respond(items) : [list(items)];
}

function assertRequest(
  call: { method: string; url: string; body: string | null },
  want: Literal,
) {
  const url = new URL(call.url);
  assertEquals(call.method, want.method);
  assertEquals(url.pathname, want.path);
  assertEquals(url.search.replace(/^\?/, ""), want.search ?? "");
  if (want.body !== undefined) assertEquals(JSON.parse(call.body ?? "null"), want.body);
}

for (const c of CASES) {
  describe(c.trigger.key, () => {
    test("declares output, sample and a poll interval", () => {
      assertEquals(c.trigger.output.length > 0, true);
      assertEquals(c.trigger.sample !== undefined, true);
      assertEquals(typeof c.trigger.poll, "function");
      assertEquals(c.trigger.onSubscribe, undefined);
    });

    test("seeds without emitting, sends the literal newest-first request", async () => {
      const m = mockCtx(responsesFor(c, [c.item("old")]));
      const seeded = await c.trigger.poll!({ state: {}, params: c.params } as never, m.ctx);
      assertEquals(seeded.events, []);
      assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
      assertRequest(m.calls[0], c.literal);
      const follow = c.followUps?.([c.item("old")]) ?? [];
      assertEquals(m.calls.length, 1 + follow.length);
      follow.forEach((f, i) => assertRequest(m.calls[i + 1], f));
    });

    test("emits only the new item, oldest-first, and a retry is identical", async () => {
      const seeded = await c.trigger.poll!(
        { state: {}, params: c.params } as never,
        mockCtx(responsesFor(c, [c.item("old")])).ctx,
      );
      const page = [c.item("newer"), c.item("new"), c.item("old")];
      const first = await c.trigger.poll!(
        { state: seeded.nextState, params: c.params } as never,
        mockCtx(responsesFor(c, page)).ctx,
      );
      const retry = await c.trigger.poll!(
        { state: seeded.nextState, params: c.params } as never,
        mockCtx(responsesFor(c, page)).ctx,
      );
      assertEquals(first.events, [c.item("new"), c.item("newer")]);
      assertEquals(retry, first);
    });

    if (c.stamp) {
      test("an edited item (same id, new stamp) is emitted again", async () => {
        const seeded = await c.trigger.poll!(
          { state: {}, params: c.params } as never,
          mockCtx(responsesFor(c, [c.item("a", "2026-11-10T08:00:00.000Z")])).ctx,
        );
        const edited = c.item("a", "2026-11-10T09:30:00.000Z");
        const out = await c.trigger.poll!(
          { state: seeded.nextState, params: c.params } as never,
          mockCtx(responsesFor(c, [edited])).ctx,
        );
        assertEquals(out.events, [edited]);
        const again = await c.trigger.poll!(
          { state: out.nextState, params: c.params } as never,
          mockCtx(responsesFor(c, [edited])).ctx,
        );
        assertEquals(again.events, []);
      });
    }

    test("is bounded to one list request per check", async () => {
      const body = { object: "list", results: [c.item("a")], next_cursor: "c2", has_more: true };
      const m = mockCtx(
        c.respond ? c.respond([c.item("a")]) : [{ body }],
      );
      await c.trigger.poll!({ state: {}, params: c.params } as never, m.ctx);
      assertEquals(m.calls.length, 1 + (c.followUps?.([c.item("a")]).length ?? 0));
    });
  });
}
