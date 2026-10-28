import type { ActionDefinition } from "@w6w/types";
import {
  batchUpdate,
  buildMatchCriteria,
  REVISION_PARAM,
  singleRequestBody,
} from "../lib/client.ts";

interface Input {
  presentationId: string;
  text: string;
  replaceText: string;
  matchCase?: boolean;
  searchByRegex?: boolean;
  pageObjectIds?: string[];
  failIfNoMatch?: boolean;
  requiredRevisionId?: string;
}

interface BatchReply {
  replies?: Array<{ replaceAllText?: { occurrencesChanged?: number } }>;
}

/**
 * `replaceAllText` via `presentations.batchUpdate` — deck-wide find and replace,
 * the workhorse behind "fill this template".
 *
 * **This is the app's one honest 2xx-that-might-mean-nothing.** The batch itself
 * is atomic, so a 200 does mean the request was applied; what it does not mean
 * is that anything *matched*. A search string that appears nowhere returns 200
 * with `replies: [{ replaceAllText: {} }]` — `occurrencesChanged` is an int32
 * and protobuf JSON omits it when it is zero, so the successful-looking reply
 * for "changed nothing" is an empty object, not `{ occurrencesChanged: 0 }`.
 *
 * Two things follow, and both are implemented rather than documented away:
 *   - `occurrencesChanged` is normalised to a real number and lifted to the top
 *     of the output, so a workflow can branch on it;
 *   - `failIfNoMatch` (opt-in, default off) turns "matched nothing" into a
 *     thrown error, for the common template case where a zero-match run means
 *     the placeholder was renamed and everything downstream is now wrong.
 *
 * `pageObjectIds` restricts the sweep to specific pages. Passing the object ID
 * of a notes master, or of a page that isn't in the deck, is a documented 400 —
 * not a silent skip.
 */
const textReplaceAll: ActionDefinition<Input> = {
  key: "text-replace-all",
  type: "perform",
  resource: "text",
  title: "Find and Replace Text",
  description:
    "Replace every occurrence of a string across the presentation (or specific pages), reporting how many occurrences changed.",
  idempotent: false,
  params: [
    { key: "presentationId", label: "Presentation ID or URL", type: "string", required: true },
    {
      key: "text",
      label: "Find",
      type: "text",
      required: true,
      hint: "The text to search for. Treated as a regular expression when Search By Regex is on.",
    },
    { key: "replaceText", label: "Replace With", type: "text", required: true },
    { key: "matchCase", label: "Match Case", type: "boolean", default: false },
    {
      key: "searchByRegex",
      label: "Search By Regex",
      type: "boolean",
      default: false,
      hint: "When on, the Find value is a regular expression; escape any backslashes.",
    },
    {
      key: "pageObjectIds",
      label: "Limit To Page Object IDs",
      type: "array",
      item: { type: "string" },
      advanced: true,
      hint:
        "Optional. Restricts the sweep to these pages. A notes master ID, or an ID not in this presentation, is rejected with 400.",
    },
    {
      key: "failIfNoMatch",
      label: "Fail If Nothing Matched",
      type: "boolean",
      default: false,
      advanced: true,
      hint:
        "Google answers 200 even when the search string appears nowhere. Turn this on to raise an error instead of quietly continuing.",
    },
    REVISION_PARAM,
  ],
  output: [
    {
      key: "occurrencesChanged",
      type: "number",
      label: "Occurrences changed — 0 means the search matched nothing",
    },
    { key: "presentationId", type: "string", label: "Presentation ID" },
    { key: "replies", type: "array", label: "Raw replies" },
    { key: "writeControl", type: "object", label: "Resulting write control" },
  ],

  async execute(input, ctx) {
    const request: Record<string, unknown> = {
      replaceText: input.replaceText,
      containsText: buildMatchCriteria(input.text, input.matchCase, input.searchByRegex),
    };
    if (input.pageObjectIds?.length) request.pageObjectIds = input.pageObjectIds;

    const result = await batchUpdate<BatchReply & Record<string, unknown>>(
      ctx,
      input.presentationId,
      singleRequestBody({ replaceAllText: request }, {
        requiredRevisionId: input.requiredRevisionId,
      }),
    );

    // Absent means zero: protobuf JSON drops int32 fields at their default.
    const occurrencesChanged = result?.replies?.[0]?.replaceAllText?.occurrencesChanged ?? 0;
    if (occurrencesChanged === 0 && input.failIfNoMatch) {
      throw new Error(
        "replaceAllText matched nothing: 0 occurrences changed (the API still returned 200)",
      );
    }
    return { ...result, occurrencesChanged };
  },
};

export default textReplaceAll;
