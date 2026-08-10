import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import listRecords from "./actions/list-records.ts";
import searchRecords from "./actions/search-records.ts";
import getRecord from "./actions/get-record.ts";
import createRecord from "./actions/create-record.ts";
import updateRecord from "./actions/update-record.ts";
import upsertRecord from "./actions/upsert-record.ts";
import deleteRecord from "./actions/delete-record.ts";
import listRecordAttributeValues from "./actions/list-record-attribute-values.ts";
import listRecordEntries from "./actions/list-record-entries.ts";

import listLists from "./actions/list-lists.ts";
import listEntries from "./actions/list-entries.ts";
import getEntry from "./actions/get-entry.ts";
import createEntry from "./actions/create-entry.ts";
import updateEntry from "./actions/update-entry.ts";
import upsertEntry from "./actions/upsert-entry.ts";
import deleteEntry from "./actions/delete-entry.ts";

import listObjects from "./actions/list-objects.ts";
import listAttributes from "./actions/list-attributes.ts";
import listSelectOptions from "./actions/list-select-options.ts";
import listStatuses from "./actions/list-statuses.ts";

import listNotes from "./actions/list-notes.ts";
import createNote from "./actions/create-note.ts";
import deleteNote from "./actions/delete-note.ts";

import listTasks from "./actions/list-tasks.ts";
import createTask from "./actions/create-task.ts";
import updateTask from "./actions/update-task.ts";
import deleteTask from "./actions/delete-task.ts";

import listWorkspaceMembers from "./actions/list-workspace-members.ts";
import getIdentity from "./actions/get-identity.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Records — object-parameterised, because standard and custom objects share
    // one endpoint shape (`/v2/objects/{object}/records`). See lib/client.ts.
    listRecords,
    searchRecords,
    getRecord,
    createRecord,
    updateRecord,
    upsertRecord,
    deleteRecord,
    listRecordAttributeValues,
    listRecordEntries,
    // Lists & entries — the other half of the data model. A record lives on an
    // object; it *appears* on any number of lists, each with its own attributes.
    listLists,
    listEntries,
    getEntry,
    createEntry,
    updateEntry,
    upsertEntry,
    deleteEntry,
    // Schema — the slugs, types and is_unique/is_multiselect flags every write
    // above is keyed by. Read these first.
    listObjects,
    listAttributes,
    listSelectOptions,
    listStatuses,
    // Notes
    listNotes,
    createNote,
    deleteNote,
    // Tasks
    listTasks,
    createTask,
    updateTask,
    deleteTask,
    // Identity — workspace members are the actors owners/assignees point at;
    // /v2/self reports the token's own scopes.
    listWorkspaceMembers,
    getIdentity,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
