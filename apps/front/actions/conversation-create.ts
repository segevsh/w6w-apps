import type { ActionDefinition } from "@w6w/types";
import { compact, csv, FrontClient, unixSeconds } from "../lib/client.ts";

/**
 * `POST /conversations` — verified against Front's own OpenAPI document
 * (`create-conversation`).
 *
 * **This creates a conversation nobody outside the company can see.** Front is
 * explicit about it: this route makes a `discussion` or a `task`, and "both
 * types only support comments". No customer is on the thread and no message can
 * be sent into it. It is the internal-thread route — a place for a team to work
 * something out, or a task to be tracked, next to the customer conversations.
 *
 * To start a thread that reaches a customer, send a message out through a
 * channel (`message-send`); Front creates the conversation around it.
 *
 * **Either an inbox or a set of teammates, never both** — that is Front's rule,
 * and it is what decides who can see the thing: an `inbox_id` puts it in a
 * shared inbox, `teammate_ids` makes it private to those people.
 */
const action: ActionDefinition = {
  key: "conversation-create",
  type: "perform",
  resource: "conversation",
  title: "Create discussion or task",
  description:
    "An internal thread — a discussion or a task. Comment-only: no customer is on it and no " +
    "message can be sent into it. Use Send Message to start a customer conversation.",
  idempotent: false,
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      default: "discussion",
      options: [
        { value: "discussion", label: "Discussion — an internal thread" },
        { value: "task", label: "Task — a thread with an owner and a due date" },
      ],
    },
    {
      key: "subject",
      label: "Subject",
      type: "string",
      required: true,
      default: "",
      hint: "Used as the title for a task.",
    },
    {
      key: "body",
      label: "First Comment",
      type: "text",
      default: "",
      hint: "Required for a discussion, optional for a task. Markdown is supported.",
    },
    {
      key: "inboxId",
      label: "Inbox ID",
      type: "string",
      default: "",
      placeholder: "inb_55c8c149",
      hint: "Put the thread in a shared inbox. Either this OR Teammate IDs — Front rejects both.",
    },
    {
      key: "teammateIds",
      label: "Teammate IDs",
      type: "string",
      default: "",
      hint: "Comma-separated. Makes the thread private to these teammates. Either this OR an " +
        "Inbox ID.",
    },
    {
      key: "authorId",
      label: "Author ID",
      type: "string",
      default: "",
      advanced: true,
      hint: "Post the first comment as this teammate. Omitted, it posts as the API token itself " +
        "— which reads as a robot in the thread.",
    },
    {
      key: "description",
      label: "Task Description",
      type: "text",
      default: "",
      advanced: true,
      showIf: { "==": [{ var: "type" }, "task"] },
    },
    {
      key: "dueAt",
      label: "Due At",
      type: "datetime",
      default: "",
      advanced: true,
      showIf: { "==": [{ var: "type" }, "task"] },
      hint: "Tasks only. Must be in the future.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Conversation ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const type = String(p.type ?? "discussion");
    const subject = String(p.subject ?? "").trim();
    if (!subject) throw new Error("`subject` is required");

    const inboxId = String(p.inboxId ?? "").trim();
    const teammateIds = csv(p.teammateIds);
    // Front rejects both together, and refusing here names the problem instead
    // of returning its validation tree.
    if (inboxId && teammateIds) {
      throw new Error(
        "give either `inboxId` (a shared inbox) or `teammateIds` (private to those people), " +
          "not both — Front rejects the pair",
      );
    }
    if (!inboxId && !teammateIds) {
      throw new Error(
        "one of `inboxId` or `teammateIds` is required — Front needs to know who " +
          "can see the thread",
      );
    }

    const body = String(p.body ?? "").trim();
    if (type === "discussion" && !body) {
      throw new Error("`body` is required for a discussion — Front needs the starter comment");
    }

    const dueAt = p.dueAt === undefined || p.dueAt === "" ? undefined : p.dueAt;
    const payload = compact({
      type,
      subject,
      inbox_id: inboxId || undefined,
      teammate_ids: teammateIds,
      comment: body
        ? compact({ body, author_id: String(p.authorId ?? "") || undefined })
        : undefined,
      description: type === "task" ? String(p.description ?? "") || undefined : undefined,
      // Front takes Unix SECONDS; the form hands over an ISO string.
      due_at: type === "task" ? unixSeconds(dueAt, "dueAt") : undefined,
    });

    ctx.log("info", "creating Front conversation", { type, private: Boolean(teammateIds) });
    return await new FrontClient(ctx).request("/conversations", { method: "POST", body: payload });
  },
};

export default action;
