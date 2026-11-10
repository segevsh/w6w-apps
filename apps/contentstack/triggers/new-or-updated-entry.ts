import { sinceTrigger } from "../lib/since.ts";
import {
  CONTENT_TYPE_PARAM,
  type Entry,
  entryOutput,
  type EntryParams,
  entrySample,
  entryWindow,
  timeMs,
} from "../lib/entries.ts";

/**
 * Since-filter (brief 9.1 b, 9.2): the window is every entry of the chosen content type updated
 * after the previous check (`query` `updated_at` `$gt`); an edit changes `updated_at`, so the id
 * carries it and each update is one event. Safeguards 9.8 and 9.9 live in `lib/since.ts`.
 */
export default sinceTrigger<Entry, EntryParams>({
  key: "new-or-updated-entry",
  title: "New or Updated Entry",
  description:
    "The run gets each entry of one content type that is new or has been edited, once per update.",
  params: [CONTENT_TYPE_PARAM],
  fetchWindow: (sinceMs, ctx, params) =>
    entryWindow("updated_at", sinceMs, ctx, params, "new-or-updated-entry"),
  idOf: (entry) => `${entry.uid}:${entry.updated_at}`,
  timeOf: (entry) => timeMs(entry.updated_at),
  output: entryOutput,
  sample: entrySample,
});
