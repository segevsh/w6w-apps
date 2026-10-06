import type { Param } from "@w6w/types";
import { jsonValue, type QueryPairs } from "./client.ts";

/** One way of naming a person in Encharge: at least one of these must be present. */
export interface PersonRef {
  id?: string;
  userId?: string;
  email?: string;
}

export interface PersonRefInput extends PersonRef {
  people?: unknown;
}

/** The three identifier params every single-person action shares. */
export const personRefParams: Param[] = [
  {
    key: "email",
    label: "Email",
    type: "string",
    hint: "The person's email. At least one of Email, User ID or Encharge ID is required.",
  },
  {
    key: "userId",
    label: "User ID",
    type: "string",
    hint: "Your own ID for the person (the `userId` property).",
  },
  {
    key: "id",
    label: "Encharge ID",
    type: "string",
    hint: "Encharge's own UUID for the person.",
  },
];

const clean = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const text = String(v).trim();
  return text === "" ? undefined : text;
};

/** Pick the identifiers off an input; throws before any request when none is present. */
export function personRef(input: PersonRef): PersonRef {
  const ref: PersonRef = {};
  const email = clean(input.email);
  const userId = clean(input.userId);
  const id = clean(input.id);
  if (email) ref.email = email;
  if (userId) ref.userId = userId;
  if (id) ref.id = id;
  if (!ref.email && !ref.userId && !ref.id) {
    throw new Error("Give at least one of email, userId or id to identify the person.");
  }
  return ref;
}

/**
 * Resolve the people an action targets: a `people` JSON array of `{id?, userId?, email?}` when
 * given, otherwise the single person named by the identifier params.
 */
export function personRefs(input: PersonRefInput): PersonRef[] {
  const raw = jsonValue(input.people);
  if (raw !== undefined) {
    if (!Array.isArray(raw) || raw.length === 0) {
      throw new Error("`people` must be a non-empty JSON array of {id, userId, email} objects.");
    }
    return raw.map((p) => personRef((p ?? {}) as PersonRef));
  }
  return [personRef(input)];
}

/** `people[0][email]=…&people[1][userId]=…` — the documented selector for GET/DELETE /people. */
export function peopleQuery(refs: PersonRef[]): QueryPairs {
  const pairs: QueryPairs = [];
  refs.forEach((ref, i) => {
    for (const k of ["id", "userId", "email"] as const) {
      if (ref[k]) pairs.push([`people[${i}][${k}]`, ref[k]]);
    }
  });
  return pairs;
}

/** The multi-person param shared by the actions that can target several people. */
export const peopleParam: Param = {
  key: "people",
  label: "People (JSON array)",
  type: "json",
  hint: 'Several people at once, e.g. [{"email":"a@x.com"},{"userId":"42"}]. When set, the ' +
    "single-person fields are ignored.",
};
