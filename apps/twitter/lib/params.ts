import type { Param } from "@w6w/types";

/**
 * `tweet.fields` — the optional-field list X's v2 API expects as a
 * comma-separated query param on every endpoint that returns a Post object.
 * Ported from the current field list X documents; `id`/`text` are always
 * returned regardless of this selection.
 */
export const tweetFields: Param = {
  key: "tweetFields",
  label: "Additional tweet fields",
  type: "multiselect",
  advanced: true,
  options: [
    { value: "attachments", label: "Attachments" },
    { value: "author_id", label: "Author ID" },
    { value: "context_annotations", label: "Context annotations" },
    { value: "conversation_id", label: "Conversation ID" },
    { value: "created_at", label: "Created at" },
    { value: "entities", label: "Entities" },
    { value: "geo", label: "Geo" },
    { value: "in_reply_to_user_id", label: "In reply to user ID" },
    { value: "lang", label: "Language" },
    { value: "public_metrics", label: "Public metrics" },
    { value: "possibly_sensitive", label: "Possibly sensitive" },
    { value: "referenced_tweets", label: "Referenced tweets" },
    { value: "reply_settings", label: "Reply settings" },
    { value: "source", label: "Source" },
    { value: "withheld", label: "Withheld" },
  ],
  hint: "id and text are always returned; select any extra fields to include.",
};

/** Turn a `multiselect` value (string[] | undefined) into X's comma-separated form. */
export function joinFields(values: string[] | undefined): string | undefined {
  return values && values.length > 0 ? values.join(",") : undefined;
}
