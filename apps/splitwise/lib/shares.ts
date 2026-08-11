import type { Param } from "@w6w/types";
import { AMOUNT_PATTERN_SOURCE, fromMinorUnits, sumMinorUnits, toMinorUnits } from "./money.ts";

/**
 * The Splitwise share model, and its translation to the wire.
 *
 * ## What the API actually wants
 *
 * An expense splits across users. Splitwise offers two forms, and the reference
 * models them as a `oneOf` of two request bodies:
 *
 *  1. **Split equally** — `{group_id, split_equally: true, description, cost}`.
 *     Only available with a `group_id`, and "the authenticated user is assumed
 *     to be the payer". Splitwise divides the cost across the group's members
 *     itself; the caller supplies no per-user numbers at all.
 *  2. **Split by shares** — the caller supplies one entry per participating
 *     user, each with a `paid_share` and an `owed_share`.
 *
 * The second form is where integrations break, because the wire encoding is not
 * an array. Splitwise takes a **JSON object with flattened, index-embedded
 * keys**:
 *
 * ```json
 * { "group_id": 0, "cost": "25.00", "description": "Brunch",
 *   "users__0__user_id": 54123,  "users__0__paid_share": "25.00",
 *   "users__0__owed_share": "13.55",
 *   "users__1__email": "neu@example.com", "users__1__first_name": "Neu",
 *   "users__1__last_name": "Yewzer", "users__1__paid_share": "0",
 *   "users__1__owed_share": "11.45" }
 * ```
 *
 * The vendor spells the convention `users__{index}__{property}` — two
 * underscores on each side of the index — and applies the same encoding to
 * `create_group` and `create_friends`. This module is the only place in the app
 * that builds it, so the double-underscore appears exactly once.
 *
 * ## Identity: a share names a user two ways, and only two
 *
 * > each share must include `paid_share` and `owed_share`, and must be
 * > identified by one of the following: `email`, `first_name`, and `last_name`;
 * > or `user_id`
 *
 * That is the whole rule, and {@link normalizeShare} enforces it literally.
 * Sending an email with no names is not a documented third form — it is the
 * first form, incompletely filled in — so it is rejected here rather than sent
 * and hoped for. A caller holding only an email should resolve it to a
 * `user_id` first with **List Friends**.
 *
 * ## The balance rule, and the honest limit of what we know
 *
 * Shares have to add up. Splitwise's model is a ledger: `paid_share` is what
 * each user put in, `owed_share` is what each user consumed, and both columns
 * must total the expense's `cost`. A three-way $100 dinner one person paid for
 * is `paid = [100, 0, 0]`, `owed = [33.34, 33.33, 33.33]` — the two columns sum
 * to 100 independently, and the difference per user is the debt Splitwise then
 * records.
 *
 * **What the reference does not say is what happens when they do not sum.** The
 * request schema states no such constraint, the endpoint description states no
 * such constraint, and no example shows the failure. There is only the
 * documented failure *channel*: `create_expense` answers **HTTP 200 with a
 * populated `errors` object**, and the reference says in bold that "the
 * operation was successful only if `errors` is empty". We had no Splitwise
 * credential with which to measure the actual message, and are not going to
 * describe one we did not see.
 *
 * So this app takes the conservative side of an unknown: {@link assertBalanced}
 * checks both columns against `cost` **client-side, in integer minor units**,
 * and refuses to send an unbalanced expense — which turns "200 OK, and an
 * `errors` object you have to know to look inside" into a precise message
 * naming both totals. Because the underlying behaviour is *unverified* and not
 * *known-fatal*, the guard is overridable: set `allowUnbalancedShares` and the
 * request goes out untouched, so a caller who needs to find out what Splitwise
 * really does can, and gets the vendor's own answer back through the same
 * soft-failure path as every other write.
 */

/** One participant's share of an expense, before flattening. */
export interface ShareInput {
  user_id?: number | string;
  email?: string;
  first_name?: string;
  last_name?: string;
  paid_share: string | number;
  owed_share: string | number;
}

/** A share whose identity has been resolved to exactly one documented form. */
export interface NormalizedShare {
  identity: { user_id: number } | { email: string; first_name: string; last_name: string };
  paid_share: string;
  owed_share: string;
}

/**
 * The `users` Param, shared by Create Expense (by shares) and Update Expense.
 *
 * A `type: "array"` of `type: "object"` items rather than a free-form `json`
 * blob: the flattened wire form is an implementation detail of Splitwise's
 * parameter parser, and pushing it into the editor would make every caller
 * reimplement {@link flattenShares} by hand in a template string.
 */
export const sharesParam: Param = {
  key: "users",
  label: "Shares",
  type: "array",
  required: true,
  item: {
    type: "object",
    fields: [
      {
        key: "user_id",
        label: "User ID",
        type: "number",
        validation: { integer: true, min: 1 },
        hint: "From List Friends or a group's members. Leave empty to identify by email instead.",
      },
      {
        key: "email",
        label: "Email",
        type: "string",
        hint: "Only when there is no user ID. Splitwise then also requires both names.",
      },
      { key: "first_name", label: "First name", type: "string", row: "name" },
      { key: "last_name", label: "Last name", type: "string", row: "name" },
      {
        key: "paid_share",
        label: "Paid",
        type: "string",
        required: true,
        placeholder: "25.00",
        row: "amounts",
        validation: { pattern: AMOUNT_PATTERN_SOURCE },
        hint: "What this user actually paid. Across all shares this must total the cost.",
      },
      {
        key: "owed_share",
        label: "Owed",
        type: "string",
        required: true,
        placeholder: "12.50",
        row: "amounts",
        validation: { pattern: AMOUNT_PATTERN_SOURCE },
        hint: "What this user is on the hook for. Across all shares this must also total the cost.",
      },
    ],
  },
  hint:
    "One entry per participating user. Identify each by user ID, or by email plus first and last " +
    "name — those are the only two forms Splitwise documents. Both the paid column and the owed " +
    "column must add up to the expense cost.",
};

/** The escape hatch on {@link assertBalanced}. See the module doc for why it exists. */
export const allowUnbalancedParam: Param = {
  key: "allowUnbalancedShares",
  label: "Send unbalanced shares anyway",
  type: "boolean",
  advanced: true,
  hint:
    "Off by default: shares whose paid or owed column does not total the cost are rejected here, " +
    "with both totals named. Splitwise's own reference does not document what it does with an " +
    "unbalanced expense — it documents only that a rejected write comes back as HTTP 200 with a " +
    "populated `errors` object — so turn this on to send the request untouched and read " +
    "Splitwise's own answer.",
};

/** Coerce a `type: "array"` param value into shares, rejecting anything else. */
export function asShares(value: unknown, label = "Shares"): ShareInput[] {
  const list = typeof value === "string" && value.trim() !== "" ? tryParse(value, label) : value;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(`${label} must be a non-empty list of {user_id | email+names, paid, owed}`);
  }
  return list as ShareInput[];
}

function tryParse(value: string, label: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/**
 * Resolve one share to exactly one of the two documented identity forms.
 *
 * `user_id` wins when both are supplied, because it is unambiguous — an email
 * can belong to a user who has not registered, in which case Splitwise would
 * mint an invited placeholder rather than address the person meant.
 */
export function normalizeShare(share: ShareInput, index: number): NormalizedShare {
  const where = `users[${index}]`;
  if (!share || typeof share !== "object") throw new Error(`${where} is not an object`);

  const paid_share = String(share.paid_share ?? "").trim();
  const owed_share = String(share.owed_share ?? "").trim();
  // Parse for the side effect of validating: an unparseable amount must fail
  // here, naming the share, rather than at the sum.
  toMinorUnits(paid_share, `${where}.paid_share`);
  toMinorUnits(owed_share, `${where}.owed_share`);

  const rawId = share.user_id;
  if (rawId !== undefined && rawId !== null && String(rawId).trim() !== "") {
    const id = Number(String(rawId).trim());
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`${where}.user_id must be a positive integer, got "${String(rawId)}"`);
    }
    return { identity: { user_id: id }, paid_share, owed_share };
  }

  const email = (share.email ?? "").trim();
  const first_name = (share.first_name ?? "").trim();
  const last_name = (share.last_name ?? "").trim();
  if (email && first_name && last_name) {
    return { identity: { email, first_name, last_name }, paid_share, owed_share };
  }

  throw new Error(
    `${where} must identify a user either by user_id, or by email plus first_name and last_name ` +
      "— those are the only two forms Splitwise documents. Resolve an email to a user_id with " +
      "List Friends if you do not have both names.",
  );
}

/**
 * Both columns must total the cost. Throws naming both totals when they do not.
 *
 * The comparison is on integer minor units. In floating point an even
 * three-way split of `30.30` does not add up — `10.10 + 10.10 + 10.10` is
 * `30.299999999999997` — and would be refused.
 */
export function assertBalanced(cost: string | number, shares: NormalizedShare[]): void {
  const total = toMinorUnits(cost, "cost");
  const paid = sumMinorUnits(shares.map((s) => s.paid_share), "paid_share");
  const owed = sumMinorUnits(shares.map((s) => s.owed_share), "owed_share");

  const problems: string[] = [];
  if (paid !== total) {
    problems.push(`paid shares total ${fromMinorUnits(paid)}, cost is ${fromMinorUnits(total)}`);
  }
  if (owed !== total) {
    problems.push(`owed shares total ${fromMinorUnits(owed)}, cost is ${fromMinorUnits(total)}`);
  }
  if (problems.length === 0) return;

  throw new Error(
    `Shares do not balance: ${problems.join("; ")}. Both the paid column and the owed column ` +
      "must add up to the expense cost. Splitwise's reference does not document what it does " +
      "with an unbalanced expense, so this app refuses to send one; set " +
      "`allowUnbalancedShares` to send it regardless and read Splitwise's own answer.",
  );
}

/**
 * Build the `users__{index}__{property}` keys for a request body.
 *
 * `user_id` is emitted as a **number** while `paid_share` / `owed_share` are
 * emitted as **strings**, matching the vendor's schema exactly: the named
 * properties `users__0__user_id` (`type: integer`) and `users__0__paid_share`
 * (`type: string`) are declared separately from the `additionalProperties`
 * clause that generalises them to every index, and that clause's blanket
 * `type: string` describes the tail of the object, not a contradiction of the
 * two properties spelled out above it.
 */
export function flattenShares(shares: NormalizedShare[]): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  shares.forEach((share, index) => {
    const at = (property: string) => `users__${index}__${property}`;
    if ("user_id" in share.identity) {
      out[at("user_id")] = share.identity.user_id;
    } else {
      out[at("email")] = share.identity.email;
      out[at("first_name")] = share.identity.first_name;
      out[at("last_name")] = share.identity.last_name;
    }
    out[at("paid_share")] = share.paid_share;
    out[at("owed_share")] = share.owed_share;
  });
  return out;
}

/**
 * The whole by-shares pipeline: coerce, normalize, balance, flatten.
 *
 * One entry point so Create Expense and Update Expense cannot drift apart —
 * `update_expense` reuses `create_expense`'s parameters wholesale, and its
 * documented behaviour ("if any value is supplied for `users__{index}__…`,
 * *all* shares for the expense will be overwritten") makes a divergence there
 * a silent data-loss bug rather than a validation difference.
 */
export function buildShareFields(
  users: unknown,
  cost: string | number | undefined,
  allowUnbalanced: boolean | undefined,
): Record<string, string | number> {
  const shares = asShares(users).map(normalizeShare);
  if (!allowUnbalanced) {
    if (cost === undefined || cost === null || cost === "") {
      throw new Error(
        "cost is required to check that the shares balance. Supply it, or set " +
          "`allowUnbalancedShares` to skip the check.",
      );
    }
    assertBalanced(cost, shares);
  }
  return flattenShares(shares);
}

/**
 * The same flattening for the *membership* lists on `create_group`.
 *
 * Splitwise reuses the encoding but not the property set: here it is
 * `user_id`, `first_name`, `last_name`, `email`, and "the user's email or ID
 * must be provided". Note that the vendor's own worked example for this
 * endpoint sends `users__1__id` while its prose says the property is `user_id`
 * — the prose is followed, because `id` appears nowhere else in the API and the
 * example is the one line of the two that no schema backs.
 */
export interface MemberInput {
  user_id?: number | string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export function flattenMembers(
  members: unknown,
  label = "Members",
): Record<string, string | number> {
  if (members === undefined || members === null || members === "") return {};
  const list = typeof members === "string" ? tryParse(members, label) : members;
  if (!Array.isArray(list)) throw new Error(`${label} must be a list of users`);

  const out: Record<string, string | number> = {};
  (list as MemberInput[]).forEach((member, index) => {
    const where = `${label.toLowerCase()}[${index}]`;
    const at = (property: string) => `users__${index}__${property}`;
    const rawId = member?.user_id;
    const email = (member?.email ?? "").trim();
    const hasId = rawId !== undefined && rawId !== null && String(rawId).trim() !== "";

    if (!hasId && !email) {
      throw new Error(`${where} must supply either user_id or email — Splitwise requires one`);
    }
    if (hasId) {
      const id = Number(String(rawId).trim());
      if (!Number.isInteger(id) || id <= 0) {
        throw new Error(`${where}.user_id must be a positive integer, got "${String(rawId)}"`);
      }
      out[at("user_id")] = id;
    }
    if (email) out[at("email")] = email;
    if (member?.first_name) out[at("first_name")] = String(member.first_name).trim();
    if (member?.last_name) out[at("last_name")] = String(member.last_name).trim();
  });
  return out;
}

/** The `members` Param for Create Group. */
export const membersParam: Param = {
  key: "members",
  label: "Members",
  type: "array",
  item: {
    type: "object",
    fields: [
      {
        key: "user_id",
        label: "User ID",
        type: "number",
        validation: { integer: true, min: 1 },
        hint: "Existing Splitwise user. Supply this or an email.",
      },
      { key: "email", label: "Email", type: "string" },
      { key: "first_name", label: "First name", type: "string", row: "name" },
      { key: "last_name", label: "Last name", type: "string", row: "name" },
    ],
  },
  hint:
    "Members to add besides yourself — the current user is added to a new group automatically. " +
    "Each entry needs a user ID or an email; a name is only used when the email belongs to " +
    "nobody yet, in which case Splitwise creates an invited placeholder user.",
};
