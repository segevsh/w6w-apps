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
 * Since-filter (brief 9.1 b): the window is every entry of the chosen content type created after
 * the previous check (`query` `created_at` `$gt`, see `lib/entries.ts`). Safeguards 9.8 and 9.9
 * live in `lib/since.ts`.
 */
export default sinceTrigger<Entry, EntryParams>({
  key: "new-entry",
  title: "New Entry",
  description: "The run gets each new entry of one content type.",
  params: [CONTENT_TYPE_PARAM],
  fetchWindow: (sinceMs, ctx, params) =>
    entryWindow("created_at", sinceMs, ctx, params, "new-entry"),
  idOf: (entry) => String(entry.uid),
  timeOf: (entry) => timeMs(entry.created_at),
  output: entryOutput,
  sample: entrySample,
});
