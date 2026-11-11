import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newUser from "../../triggers/new-user.ts";
import newGroup from "../../triggers/new-group.ts";
import newServicePrincipal from "../../triggers/new-service-principal.ts";
import newApplication from "../../triggers/new-application.ts";
import newGroupMember from "../../triggers/new-group-member.ts";
import newGroupOwner from "../../triggers/new-group-owner.ts";
import newUserMembership from "../../triggers/new-user-membership.ts";
import newDirectoryRole from "../../triggers/new-directory-role.ts";
import newDirectoryRoleMember from "../../triggers/new-directory-role-member.ts";

const G = "https://graph.microsoft.com/v1.0";
type Trig = {
  poll?: (i: never, c: never) => Promise<{ events: unknown[]; nextState: unknown }>;
};
const poll = (t: unknown, params: unknown, state: unknown, c: unknown) =>
  (t as Trig).poll!({ params, state, subscriptionId: "sub" } as never, c as never);
const seededOf = (r: { nextState: unknown }) => (r.nextState as { seeded?: boolean }).seeded;

const newestFirst = [
  {
    name: "new-user",
    t: newUser,
    url:
      `${G}/users?%24top=100&%24orderby=createdDateTime+desc&%24select=id%2CdisplayName%2CuserPrincipalName%2Cmail%2CcreatedDateTime&%24count=true`,
  },
  {
    name: "new-group",
    t: newGroup,
    url:
      `${G}/groups?%24top=100&%24orderby=createdDateTime+desc&%24select=id%2CdisplayName%2Cdescription%2Cmail%2CgroupTypes%2CcreatedDateTime&%24count=true`,
  },
  {
    name: "new-application",
    t: newApplication,
    url:
      `${G}/applications?%24top=100&%24orderby=createdDateTime+desc&%24select=id%2CappId%2CdisplayName%2CsignInAudience%2CcreatedDateTime&%24count=true`,
  },
  {
    name: "new-service-principal",
    t: newServicePrincipal,
    url:
      `${G}/servicePrincipals?%24top=100&%24orderby=createdDateTime+desc&%24select=id%2CappId%2CdisplayName%2CservicePrincipalType%2CcreatedDateTime&%24count=true`,
  },
];

for (const { name, t, url } of newestFirst) {
  test(`${name}: seeds, emits the new record, retries idempotently, requests createdDateTime desc`, async () => {
    const seed = mockCtx([{ body: { value: [{ id: "a" }] } }]);
    const seeded = await poll(t, {}, {}, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seededOf(seeded), true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, url);
    assertEquals(
      seed.calls[0].headers["consistencylevel"] ?? seed.calls[0].headers["ConsistencyLevel"],
      "eventual",
    );
    const page = { body: { value: [{ id: "b" }, { id: "a" }] } };
    const first = await poll(t, {}, seeded.nextState, mockCtx([page]).ctx);
    const retry = await poll(t, {}, seeded.nextState, mockCtx([page]).ctx);
    assertEquals(first.events, [{ id: "b" }]);
    assertEquals(retry, first);
  });
}

const snapshots = [
  {
    name: "new-group-member",
    t: newGroupMember,
    params: { groupId: "g1" },
    url: `${G}/groups/g1/members?%24top=999`,
  },
  {
    name: "new-group-owner",
    t: newGroupOwner,
    params: { groupId: "g1" },
    url: `${G}/groups/g1/owners?%24top=999`,
  },
  {
    name: "new-user-membership",
    t: newUserMembership,
    params: { userId: "u1" },
    url: `${G}/users/u1/memberOf`,
  },
  { name: "new-directory-role", t: newDirectoryRole, params: {}, url: `${G}/directoryRoles` },
  {
    name: "new-directory-role-member",
    t: newDirectoryRoleMember,
    params: { roleId: "r1" },
    url: `${G}/directoryRoles/r1/members`,
  },
];

for (const { name, t, params, url } of snapshots) {
  test(`${name}: seeds, emits only a newly added object, retries, requests the collection`, async () => {
    const seed = mockCtx([{ body: { value: [{ id: "a" }] } }]);
    const seeded = await poll(t, params, {}, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seededOf(seeded), true);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, url);
    const page = { body: { value: [{ id: "a" }, { id: "b" }] } };
    const first = await poll(t, params, seeded.nextState, mockCtx([page]).ctx);
    const retry = await poll(t, params, seeded.nextState, mockCtx([page]).ctx);
    assertEquals(first.events, [{ id: "b" }]);
    assertEquals(retry, first);
  });
}

test("snapshot triggers follow @odata.nextLink and refuse a collection past the page cap", async () => {
  const next = (n: number) => ({
    body: {
      value: [{ id: `x${n}` }],
      "@odata.nextLink": `${G}/groups/g1/members?%24skiptoken=t${n}`,
    },
  });
  const two = mockCtx([next(1), { body: { value: [{ id: "x2" }] } }]);
  const seeded = await poll(newGroupMember, { groupId: "g1" }, {}, two.ctx);
  assertEquals(two.calls.length, 2);
  assertEquals(two.calls[1].url, `${G}/groups/g1/members?%24skiptoken=t1`);
  let err = "";
  try {
    await poll(
      newGroupMember,
      { groupId: "g1" },
      seeded.nextState,
      mockCtx([next(1), next(2), next(3), next(4), next(5)]).ctx,
    );
  } catch (e) {
    err = (e as Error).message;
  }
  assertEquals(err.includes("too large to snapshot"), true);
});
