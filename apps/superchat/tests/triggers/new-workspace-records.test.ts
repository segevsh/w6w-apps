import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import newChannel from "../../triggers/new-channel.ts";
import newContactList from "../../triggers/new-contact-list.ts";
import newContactListMembership from "../../triggers/new-contact-list-membership.ts";
import newConversation from "../../triggers/new-conversation.ts";
import newFile from "../../triggers/new-file.ts";
import newInbox from "../../triggers/new-inbox.ts";
import newTemplateFolder from "../../triggers/new-template-folder.ts";
import newTemplate from "../../triggers/new-template.ts";
import newWorkspaceUser from "../../triggers/new-workspace-user.ts";

const page = (items: unknown[], next: string | null = null) => ({
  body: { results: items, pagination: { next_cursor: next } },
});

// Contacts, channels and files document "sorted descendingly by created_at": newest-first, page 1.
const newestFirst = [
  ["new-channel", newChannel, {}, "https://api.superchat.com/v1.0/channels?limit=100"],
  ["new-file", newFile, {}, "https://api.superchat.com/v1.0/files?limit=100"],
] as const;

for (const [key, trigger, params, request] of newestFirst) {
  test(`${key}: seeds, emits, retries idempotently, and makes the literal list request`, async () => {
    const old = { id: `${key}-old` };
    const fresh = { id: `${key}-fresh` };
    const seededCall = mockCtx([page([old])]);
    const seeded = await trigger.poll!({ params, state: {} }, seededCall.ctx);
    assertEquals(seeded.events, []);
    assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
    assertEquals(seededCall.calls[0].method, "GET");
    assertEquals(seededCall.calls[0].url, request);

    const response = page([fresh, old]);
    const first = await trigger.poll!({ params, state: seeded.nextState }, mockCtx([response]).ctx);
    const retry = await trigger.poll!({ params, state: seeded.nextState }, mockCtx([response]).ctx);
    assertEquals(first.events, [fresh]);
    assertEquals(retry, first);
  });
}

// The other lists document no sort order: read whole (cursor-paged) and snapshot-diffed.
const root = "https://api.superchat.com/v1.0";
const snapshots = [
  ["new-contact-list", newContactList, {}, `${root}/contact-lists`, ""],
  [
    "new-contact-list-membership",
    newContactListMembership,
    { contactId: "contact-1" },
    `${root}/contacts/contact-1/contact-lists`,
    "",
  ],
  ["new-conversation", newConversation, {}, `${root}/conversations`, ""],
  ["new-inbox", newInbox, {}, `${root}/inboxes`, ""],
  [
    "new-template-folder",
    newTemplateFolder,
    { parentId: "folder-1" },
    `${root}/template-folders`,
    "&parent_id=folder-1",
  ],
  ["new-template-folder (no parent)", newTemplateFolder, {}, `${root}/template-folders`, ""],
  ["new-template", newTemplate, {}, `${root}/templates`, ""],
  ["new-workspace-user", newWorkspaceUser, {}, `${root}/users`, ""],
] as const;

for (const [key, trigger, params, path, extra] of snapshots) {
  test(`${key}: reads every page, seeds quietly, emits additions anywhere in the list`, async () => {
    const a = { id: "a" }, b = { id: "b" }, c = { id: "c" }, d = { id: "d" };
    const seed = mockCtx([page([a], "cur1"), page([b])]);
    const seeded = await trigger.poll!({ params, state: {} }, seed.ctx);
    assertEquals(seeded.events, []);
    assertEquals(seed.calls.length, 2);
    assertEquals(seed.calls[0].method, "GET");
    assertEquals(seed.calls[0].url, `${path}?limit=100${extra}`);
    assertEquals(seed.calls[1].url, `${path}?limit=100&after=cur1${extra}`);

    // New rows may sit at either end of the list: order is not relied on.
    const response = [page([c, a], "cur1"), page([b, d])];
    const first = await trigger.poll!({ params, state: seeded.nextState }, mockCtx(response).ctx);
    const retry = await trigger.poll!({ params, state: seeded.nextState }, mockCtx(response).ctx);
    assertEquals(first.events, [c, d]);
    assertEquals(retry, first);
  });
}

test("snapshot triggers stop with a clear error past 50 pages", async () => {
  const pages = Array.from({ length: 50 }, (_, i) => page([{ id: `r${i}` }], `cur${i}`));
  const call = mockCtx(pages);
  let message = "";
  try {
    await newInbox.poll!({ params: {}, state: {} }, call.ctx);
  } catch (error) {
    message = String((error as Error).message);
  }
  assert(message.includes("more than 5000 rows"), message);
  assertEquals(call.calls.length, 50);
});
