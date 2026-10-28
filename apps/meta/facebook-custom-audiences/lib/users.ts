import type { HookContext, OutputField, Param } from "@w6w/types";
import { asJsonValue, AudiencesClient, normalizeNodeId } from "./client.ts";
import { type HashingMode, prepareUsers } from "./audience-data.ts";

/** Meta: "a maximum of 10000 at a time". */
export const MAX_USERS_PER_REQUEST = 10_000;

export interface UsersInput {
  audienceId: string;
  users: unknown;
  hashing?: HashingMode;
  sessionId?: number;
  batchSeq?: number;
  lastBatch?: boolean;
  estimatedTotal?: number;
}

export interface UsersResponse {
  audience_id?: string;
  session_id?: string;
  num_received?: number;
  num_invalid_entries?: number;
  invalid_entry_samples?: Record<string, string>;
}

export const USERS_OUTPUT = [
  { key: "audience_id", type: "string", label: "Audience ID" },
  { key: "session_id", type: "string", label: "Session ID" },
  { key: "num_received", type: "number", label: "Rows received" },
  { key: "num_invalid_entries", type: "number", label: "Invalid rows" },
  { key: "invalid_entry_samples", type: "object", label: "Invalid row samples" },
] satisfies OutputField[];

export function usersParams(verb: string): Param[] {
  return [
    { key: "audienceId", label: "Custom Audience ID", type: "string", required: true },
    {
      key: "users",
      label: "Users",
      type: "json",
      required: true,
      hint:
        `Array of up to ${MAX_USERS_PER_REQUEST} objects to ${verb}, e.g. [{"email":"mary@example.com","phone":"+1 555 987 6543","firstName":"Mary"}]. ` +
        "Columns: email, phone, gender, birthYear, birthMonth, birthDay, firstName, lastName, firstInitial, city, state, zip, country, madid, externalId. Hashed here, never sent in the clear.",
    },
    {
      key: "hashing",
      label: "Hashing",
      type: "select",
      default: "auto",
      hint:
        "Automatic normalises and SHA-256 hashes the values. Pre-hashed refuses anything that is not already a lowercase SHA-256 digest.",
      options: [
        { value: "auto", label: "Automatic (normalise + hash)" },
        { value: "pre-hashed", label: "Pre-hashed only" },
      ],
    },
    {
      key: "sessionId",
      label: "Session ID",
      type: "number",
      hint:
        "For uploads split over several requests: one number for every batch, unique in the ad account. Omit for a single request.",
    },
    {
      key: "batchSeq",
      label: "Batch number",
      type: "number",
      default: 1,
      hint: "1-based position of this request within the session.",
    },
    {
      key: "lastBatch",
      label: "Last batch",
      type: "boolean",
      default: true,
      hint: "Must be true on the final request, or Meta never closes the session.",
    },
    {
      key: "estimatedTotal",
      label: "Estimated total rows",
      type: "number",
      hint: "Total rows across the whole session, if known.",
    },
  ];
}

/**
 * POST /{audience}/users — add (default), or the same call with
 * `method=DELETE` to remove. Meta documents both: "you can add the `method`
 * parameter and set it to `DELETE` in the `POST` request used to add audience
 * members". The `payload` and `session` travel as form fields.
 *
 * `session` is "Required" in Meta's Customer File guide although the reference
 * marks it optional, so a single-request upload sends a one-batch session
 * (`batch_seq: 1`, `last_batch_flag: true`) stamped from the clock.
 */
export async function sendUsers(
  input: UsersInput,
  ctx: HookContext,
  remove: boolean,
): Promise<UsersResponse> {
  const id = normalizeNodeId(input.audienceId, "Custom Audience ID");
  const rows = asJsonValue(input.users, "Users");
  if (Array.isArray(rows) && rows.length > MAX_USERS_PER_REQUEST) {
    throw new Error(
      `Meta accepts at most ${MAX_USERS_PER_REQUEST} users per request — split the list and use a Session ID`,
    );
  }
  const payload = await prepareUsers(rows, input.hashing ?? "auto");

  const session: Record<string, unknown> = {
    session_id: input.sessionId ?? Date.now(),
    batch_seq: input.batchSeq ?? 1,
    last_batch_flag: input.lastBatch ?? true,
  };
  if (input.estimatedTotal !== undefined) session.estimated_num_total = input.estimatedTotal;

  return await new AudiencesClient(ctx).request<UsersResponse>(`/${id}/users`, {
    method: "POST",
    form: { payload, session, method: remove ? "DELETE" : undefined },
  });
}
