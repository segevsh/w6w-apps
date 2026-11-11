import type { TriggerDefinition } from "@w6w/types";
import messageList from "../actions/message-list.ts";
import { pollWindow, type Pos } from "../lib/triggers.ts";

interface Message {
  id: string;
  timestamp?: string;
}

/**
 * `GET /api/messages?page=<n>&size=100&since=<iso>` — `since` is "First sent/received timestamp"
 * and rows carry their own `timestamp` (https://api-doc.simpletexting.com/, Get all Messages,
 * verified 2026-11-10). The endpoint documents no sort order, so this is a since-filter window
 * (resumed by page, floored at the seed) rather than a newest-first read.
 */
const trigger: TriggerDefinition = {
  key: "new-message",
  title: "New Message",
  description: "The run gets each message sent or received on an account phone number.",
  params: [
    {
      key: "accountPhone",
      label: "Account phone",
      type: "string",
      placeholder: "8005551234",
      hint: "The number on your account to watch. Blank means the account's primary number.",
    },
    {
      key: "contactPhone",
      label: "Contact phone",
      type: "string",
      placeholder: "8001234567",
      hint: "Only messages to or from this contact.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "text", type: "string", label: "Text" },
    { key: "contactPhone", type: "string", label: "Contact phone" },
    { key: "accountPhone", type: "string", label: "Account phone" },
    { key: "directionType", type: "string", label: "MT (sent) or MO (received)" },
    { key: "timestamp", type: "string", label: "Sent or received at" },
  ],
  sample: {
    id: "507f191e810c19729de860ea",
    subject: "Some message from SimpleTexting",
    text: "Hello! How are you?",
    contactPhone: "8001234567",
    accountPhone: "8005551234",
    directionType: "MO",
    timestamp: "2026-11-10T09:00:00.000Z",
    category: "SMS",
  },
  minIntervalMs: 300_000,
  poll({ state, params }, ctx) {
    const p = (params ?? {}) as { accountPhone?: string; contactPhone?: string };
    return pollWindow<Message>({
      state,
      ctx,
      stampOf: (m) => m.timestamp,
      idOf: (m) => String(m.id),
      async read(sinceIso: string, pos: Pos | undefined, c) {
        const page = typeof pos === "number" ? pos : 0;
        const res = await messageList.execute!(
          {
            page,
            size: 100,
            since: sinceIso,
            ...(p.accountPhone ? { accountPhone: p.accountPhone } : {}),
            ...(p.contactPhone ? { contactPhone: p.contactPhone } : {}),
          },
          c,
        ) as { content?: Message[]; totalPages?: number };
        return {
          items: res.content ?? [],
          next: page + 1 < (res.totalPages ?? 0) ? page + 1 : undefined,
        };
      },
    });
  },
};

export default trigger;
