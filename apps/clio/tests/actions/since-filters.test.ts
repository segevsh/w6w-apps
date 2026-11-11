import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import activityList from "../../actions/activity-list.ts";
import calendarEntryList from "../../actions/calendar-entry-list.ts";
import documentList from "../../actions/document-list.ts";
import noteList from "../../actions/note-list.ts";
import taskList from "../../actions/task-list.ts";
import { listEnvelope, mockCtx, queryOf } from "../_helpers.ts";

const lists = [
  { name: "activity-list", action: activityList },
  { name: "calendar-entry-list", action: calendarEntryList },
  { name: "document-list", action: documentList },
  { name: "note-list", action: noteList },
  { name: "task-list", action: taskList },
];

for (const { name, action } of lists) {
  test(`${name}: sends created_since / updated_since only when set`, async () => {
    const withSince = mockCtx([{ body: listEnvelope([]) }]);
    await action.execute!(
      { createdSince: "2026-11-09T10:00:00.000Z", updatedSince: "2026-11-09T11:00:00.000Z" },
      withSince.ctx,
    );
    const q = queryOf(withSince.calls[0].url);
    assertEquals(q.created_since, "2026-11-09T10:00:00.000Z");
    assertEquals(q.updated_since, "2026-11-09T11:00:00.000Z");
    const without = mockCtx([{ body: listEnvelope([]) }]);
    await action.execute!({}, without.ctx);
    const plain = queryOf(without.calls[0].url);
    assertEquals("created_since" in plain, false);
    assertEquals("updated_since" in plain, false);
  });
}
