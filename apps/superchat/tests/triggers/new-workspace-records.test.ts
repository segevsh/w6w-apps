import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
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

const cases = [
  ["new-channel", newChannel, {}, "https://api.superchat.com/v1.0/channels?limit=100"],
  [
    "new-contact-list",
    newContactList,
    {},
    "https://api.superchat.com/v1.0/contact-lists?limit=100",
  ],
  [
    "new-contact-list-membership",
    newContactListMembership,
    { contactId: "contact-1" },
    "https://api.superchat.com/v1.0/contacts/contact-1/contact-lists?limit=100",
  ],
  [
    "new-conversation",
    newConversation,
    {},
    "https://api.superchat.com/v1.0/conversations?limit=100",
  ],
  ["new-file", newFile, {}, "https://api.superchat.com/v1.0/files?limit=100"],
  ["new-inbox", newInbox, {}, "https://api.superchat.com/v1.0/inboxes?limit=100"],
  [
    "new-template-folder",
    newTemplateFolder,
    { parentId: "folder-1" },
    "https://api.superchat.com/v1.0/template-folders?limit=100&parent_id=folder-1",
  ],
  ["new-template", newTemplate, {}, "https://api.superchat.com/v1.0/templates?limit=100"],
  ["new-workspace-user", newWorkspaceUser, {}, "https://api.superchat.com/v1.0/users?limit=100"],
] as const;

const page = (items: unknown[]) => ({
  body: { results: items, pagination: { next_cursor: null } },
});

for (const [key, trigger, params, request] of cases) {
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
