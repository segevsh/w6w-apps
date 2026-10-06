/**
 * Mem — notes, collections and Mem's derived tasks, projects and follow-ups, over
 * the v2 API at `api.mem.ai`.
 *
 * Read on 2026-10-06 from Mem's OpenAPI document and prose pages. Findings:
 *
 *  1. **`/v2/*` only.** The spec still lists `/v0` and `/v1` routes; not wrapped.
 *  2. **Notes are whole-body writes.** Update needs the exact `version`; there is no
 *     partial patch, and the first content line is the title.
 *  3. **Three pagination styles** (cursor, offset+snapshot, extended-search cursor);
 *     every list action returns `{items, ..., hasMore}`.
 *  4. **Auth errors are judged by body** (`error_metadata.error_kind`), and a
 *     malformed key answers 401 with the same envelope as a missing one.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";
import noteList from "./actions/note-list.ts";
import noteGet from "./actions/note-get.ts";
import noteCreate from "./actions/note-create.ts";
import noteUpdate from "./actions/note-update.ts";
import noteDelete from "./actions/note-delete.ts";
import noteTrash from "./actions/note-trash.ts";
import noteRestore from "./actions/note-restore.ts";
import noteSearch from "./actions/note-search.ts";
import noteExtendedSearch from "./actions/note-extended-search.ts";
import noteRelatedList from "./actions/note-related-list.ts";
import collectionList from "./actions/collection-list.ts";
import collectionGet from "./actions/collection-get.ts";
import collectionCreate from "./actions/collection-create.ts";
import collectionUpdate from "./actions/collection-update.ts";
import collectionDelete from "./actions/collection-delete.ts";
import collectionSearch from "./actions/collection-search.ts";
import collectionAddNote from "./actions/collection-add-note.ts";
import collectionRemoveNote from "./actions/collection-remove-note.ts";
import collectionMoveNote from "./actions/collection-move-note.ts";
import memIt from "./actions/mem-it.ts";
import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import followUpList from "./actions/follow-up-list.ts";
import followUpGet from "./actions/follow-up-get.ts";

export default {
  actions: [
    noteList,
    noteGet,
    noteCreate,
    noteUpdate,
    noteDelete,
    noteTrash,
    noteRestore,
    noteSearch,
    noteExtendedSearch,
    noteRelatedList,
    collectionList,
    collectionGet,
    collectionCreate,
    collectionUpdate,
    collectionDelete,
    collectionSearch,
    collectionAddNote,
    collectionRemoveNote,
    collectionMoveNote,
    memIt,
    taskList,
    taskGet,
    projectList,
    projectGet,
    followUpList,
    followUpGet,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
