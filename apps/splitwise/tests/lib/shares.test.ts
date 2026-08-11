import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  assertBalanced,
  asShares,
  buildShareFields,
  flattenMembers,
  flattenShares,
  normalizeShare,
  type ShareInput,
} from "../../lib/shares.ts";

const BY_ID: ShareInput = { user_id: 54123, paid_share: "25.00", owed_share: "13.55" };
const BY_EMAIL: ShareInput = {
  email: "neu@example.com",
  first_name: "Neu",
  last_name: "Yewzer",
  paid_share: "0",
  owed_share: "11.45",
};

// --- identity ---------------------------------------------------------------

Deno.test("shares: a user_id identity survives normalization", () => {
  assertEquals(normalizeShare(BY_ID, 0), {
    identity: { user_id: 54123 },
    paid_share: "25.00",
    owed_share: "13.55",
  });
});

Deno.test("shares: an email identity needs BOTH names, per the vendor's rule", () => {
  assertEquals(normalizeShare(BY_EMAIL, 1).identity, {
    email: "neu@example.com",
    first_name: "Neu",
    last_name: "Yewzer",
  });
  // "identified by one of the following: `email`, `first_name`, and
  // `last_name`; or `user_id`" — an email alone is not a documented third form.
  assertThrows(
    () => normalizeShare({ email: "a@b.com", paid_share: "1", owed_share: "1" }, 0),
    Error,
    "must identify a user either by user_id",
  );
  assertThrows(
    () =>
      normalizeShare(
        { email: "a@b.com", first_name: "A", paid_share: "1", owed_share: "1" },
        0,
      ),
    Error,
    "must identify a user either by user_id",
  );
});

Deno.test("shares: the identity error points at List Friends, which is the actual fix", () => {
  const error = assertThrows(
    () => normalizeShare({ email: "a@b.com", paid_share: "1", owed_share: "1" }, 3),
    Error,
  ) as Error;
  assert(/users\[3\]/.test(error.message), error.message);
  assert(/List Friends/.test(error.message), error.message);
});

/**
 * `user_id` wins when both are given: an email can belong to a user who has not
 * registered, in which case Splitwise mints an invited placeholder rather than
 * addressing the person meant.
 */
Deno.test("shares: user_id wins over email when both are supplied", () => {
  const share = normalizeShare({ ...BY_ID, email: "x@y.com", first_name: "X", last_name: "Y" }, 0);
  assertEquals(share.identity, { user_id: 54123 });
});

Deno.test("shares: a non-integer user_id is rejected before the request", () => {
  assertThrows(
    () => normalizeShare({ user_id: "abc", paid_share: "1", owed_share: "1" }, 0),
    Error,
    "user_id must be a positive integer",
  );
  // `0` is a supplied value, not an omission, so it is reported as the bad id
  // it is rather than falling through to "you named nobody" — Splitwise has no
  // user 0 and silently ignoring the field would send an unattributed share.
  assertThrows(
    () => normalizeShare({ user_id: 0, paid_share: "1", owed_share: "1" }, 0),
    Error,
    "user_id must be a positive integer",
  );
});

Deno.test("shares: a malformed amount fails naming its own share", () => {
  assertThrows(
    () => normalizeShare({ user_id: 1, paid_share: "1.234", owed_share: "1" }, 2),
    Error,
    "users[2].paid_share",
  );
});

// --- the wire form ----------------------------------------------------------

/**
 * The encoding the vendor documents: `users__{index}__{property}`, two
 * underscores each side of the index, inside a JSON object — not a nested
 * array.
 */
Deno.test("shares: flattening produces the documented users__i__prop keys", () => {
  const flat = flattenShares([BY_ID, BY_EMAIL].map(normalizeShare));
  assertEquals(flat, {
    users__0__user_id: 54123,
    users__0__paid_share: "25.00",
    users__0__owed_share: "13.55",
    users__1__email: "neu@example.com",
    users__1__first_name: "Neu",
    users__1__last_name: "Yewzer",
    users__1__paid_share: "0",
    users__1__owed_share: "11.45",
  });
});

/**
 * `users__0__user_id` is declared `type: integer` while `paid_share` /
 * `owed_share` are `type: string`. The blanket `additionalProperties: string`
 * generalises the tail of the object; it does not contradict the two properties
 * spelled out above it.
 */
Deno.test("shares: user_id goes on the wire as a number, amounts as strings", () => {
  const flat = flattenShares([normalizeShare(BY_ID, 0)]);
  assertEquals(typeof flat.users__0__user_id, "number");
  assertEquals(typeof flat.users__0__paid_share, "string");
  assertEquals(typeof flat.users__0__owed_share, "string");
});

// --- the balance rule -------------------------------------------------------

Deno.test("shares: both columns must total the cost", () => {
  const shares = [BY_ID, BY_EMAIL].map(normalizeShare);
  assertBalanced("25.00", shares); // 25 + 0 = 25 · 13.55 + 11.45 = 25
});

Deno.test("shares: an unbalanced paid column is named, with both totals", () => {
  const shares = [
    { user_id: 1, paid_share: "10.00", owed_share: "12.50" },
    { user_id: 2, paid_share: "10.00", owed_share: "12.50" },
  ].map(normalizeShare);
  const error = assertThrows(() => assertBalanced("25.00", shares), Error) as Error;
  assert(/paid shares total 20.00, cost is 25.00/.test(error.message), error.message);
  assert(
    !/owed shares total/.test(error.message),
    "the owed column balanced and must not be named",
  );
});

Deno.test("shares: both columns are reported when both are off", () => {
  const shares = [{ user_id: 1, paid_share: "1.00", owed_share: "2.00" }].map(normalizeShare);
  const error = assertThrows(() => assertBalanced("25.00", shares), Error) as Error;
  assert(/paid shares total 1.00/.test(error.message), error.message);
  assert(/owed shares total 2.00/.test(error.message), error.message);
});

/**
 * The check is on integer minor units. In floating point
 * `10.10 + 10.10 + 10.10 === 30.299999999999997` (measured), so a naive
 * implementation refuses a perfectly ordinary even three-way split.
 */
Deno.test("shares: an even three-way split of 30.30 balances exactly", () => {
  const shares = [
    { user_id: 1, paid_share: "30.30", owed_share: "10.10" },
    { user_id: 2, paid_share: "0", owed_share: "10.10" },
    { user_id: 3, paid_share: "0", owed_share: "10.10" },
  ].map(normalizeShare);
  assertBalanced("30.30", shares);
  assertEquals(10.10 + 10.10 + 10.10 === 30.30, false, "the float comparison this replaces");
});

Deno.test("shares: the balance error explains that the vendor's behaviour is undocumented", () => {
  const shares = [{ user_id: 1, paid_share: "1", owed_share: "1" }].map(normalizeShare);
  const error = assertThrows(() => assertBalanced("2", shares), Error) as Error;
  assert(/does not document/.test(error.message), error.message);
  assert(/allowUnbalancedShares/.test(error.message), error.message);
});

// --- the pipeline -----------------------------------------------------------

Deno.test("buildShareFields: validates then flattens", () => {
  const flat = buildShareFields([BY_ID, BY_EMAIL], "25.00", false);
  assertEquals(flat.users__0__user_id, 54123);
  assertEquals(flat.users__1__owed_share, "11.45");
});

Deno.test("buildShareFields: the escape hatch skips the balance check only", () => {
  const flat = buildShareFields([{ user_id: 1, paid_share: "1", owed_share: "1" }], "999", true);
  assertEquals(flat.users__0__paid_share, "1");
  // …but identity is still enforced: the override is about the sums, not about
  // sending Splitwise a share it cannot attribute.
  assertThrows(
    () => buildShareFields([{ paid_share: "1", owed_share: "1" }], "999", true),
    Error,
    "must identify a user",
  );
});

Deno.test("buildShareFields: without the override, a missing cost is refused", () => {
  assertThrows(
    () => buildShareFields([BY_ID], undefined, false),
    Error,
    "cost is required to check that the shares balance",
  );
});

Deno.test("asShares: accepts an array, and the JSON string a form may hand through", () => {
  assertEquals(asShares([BY_ID]).length, 1);
  assertEquals(asShares(JSON.stringify([BY_ID, BY_EMAIL])).length, 2);
  assertThrows(() => asShares("{not json"), Error, "not valid JSON");
  assertThrows(() => asShares([]), Error, "non-empty list");
  assertThrows(() => asShares(undefined), Error, "non-empty list");
});

// --- group members ----------------------------------------------------------

Deno.test("members: same encoding, different property set", () => {
  assertEquals(
    flattenMembers([
      { first_name: "Alan", last_name: "Turing", email: "alan@example.org" },
      { user_id: 5823 },
    ]),
    {
      users__0__email: "alan@example.org",
      users__0__first_name: "Alan",
      users__0__last_name: "Turing",
      users__1__user_id: 5823,
    },
  );
});

Deno.test("members: an entry with neither user_id nor email is refused", () => {
  assertThrows(
    () => flattenMembers([{ first_name: "Alan" }]),
    Error,
    "must supply either user_id or email",
  );
});

Deno.test("members: absent members flatten to nothing", () => {
  assertEquals(flattenMembers(undefined), {});
  assertEquals(flattenMembers([]), {});
});
