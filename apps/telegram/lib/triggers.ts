import type { OutputField, Param, TriggerDefinition } from "@w6w/types";
import {
  header,
  randomSecret,
  requireRawBody,
  requireSecret,
  timingSafeEqual,
} from "../../_shared/webhook/mod.ts";
import { TelegramClient } from "./client.ts";

/**
 * Telegram Bot API webhook triggers (rfcs/trigger.md, webhook form).
 *
 * A bot has ONE webhook. `setWebhook` accepts a caller-chosen `secret_token` that Telegram echoes
 * in the `X-Telegram-Bot-Api-Secret-Token` header of every delivery (D5 (1)); there is no body
 * signature, so the shared secret in the header is the whole check.
 *
 *   - `onSubscribe` refuses when the bot already has a webhook pointed anywhere but this
 *     subscription's `callbackUrl` (replacing it would silently break whatever uses it), then calls
 *     `setWebhook` with a fresh random `secret_token`, kept in subscription state.
 *   - `onUnsubscribe` calls `deleteWebhook`, but only while the bot's webhook is still ours.
 *   - `handleIngest` compares the header to the stored secret in constant time before it parses.
 */

export interface TriggerParams {
  updateTypes?: string;
}

export interface TriggerState {
  secretToken: string;
  callbackUrl: string;
  allowedUpdates: string[] | null;
}

export interface TelegramEvent {
  updateId: number;
  updateType: string;
  chatId: string | null;
  fromId: string | null;
  messageId: number | null;
  text: string | null;
  date: number | null;
  update: Record<string, unknown>;
}

export const EVENT_OUTPUT: OutputField[] = [
  { key: "updateId", type: "number", label: "Update ID" },
  { key: "updateType", type: "string", label: "Update Type" },
  { key: "chatId", type: "string", label: "Chat ID" },
  { key: "fromId", type: "string", label: "Sender ID" },
  { key: "messageId", type: "number", label: "Message ID" },
  { key: "text", type: "string", label: "Text" },
  { key: "date", type: "number", label: "Date (epoch seconds)" },
  { key: "update", type: "object", label: "Raw Update" },
];

export const MESSAGE_SAMPLE: TelegramEvent = {
  updateId: 10000,
  updateType: "message",
  chatId: "1111111",
  fromId: "1111111",
  messageId: 1365,
  text: "Hello",
  date: 1441645532,
  update: {
    update_id: 10000,
    message: {
      message_id: 1365,
      from: { id: 1111111, is_bot: false, first_name: "Test" },
      chat: { id: 1111111, type: "private" },
      date: 1441645532,
      text: "Hello",
    },
  },
};

const UPDATE_TYPES = [
  "message",
  "edited_message",
  "channel_post",
  "edited_channel_post",
  "inline_query",
  "chosen_inline_result",
  "callback_query",
  "shipping_query",
  "pre_checkout_query",
  "poll",
  "poll_answer",
  "my_chat_member",
  "chat_member",
  "chat_join_request",
];

function asObject(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? v as Record<string, unknown>
    : null;
}

function idStr(v: unknown): string | null {
  return typeof v === "number" || typeof v === "string" ? String(v) : null;
}

function normalize(update: Record<string, unknown>): TelegramEvent | null {
  if (typeof update.update_id !== "number") return null;
  const updateType = Object.keys(update).find((k) => k !== "update_id");
  if (!updateType) return null;
  const body = asObject(update[updateType]) ?? {};
  // A callback query carries the message it came from; other updates carry their own message.
  const message = updateType === "callback_query" ? asObject(body.message) ?? {} : body;
  const chat = asObject(message.chat);
  const from = asObject(body.from);
  return {
    updateId: update.update_id,
    updateType,
    chatId: idStr(chat?.id),
    fromId: idStr(from?.id),
    messageId: typeof message.message_id === "number" ? message.message_id : null,
    text: typeof body.text === "string"
      ? body.text
      : typeof body.data === "string"
      ? body.data
      : typeof body.caption === "string"
      ? body.caption
      : null,
    date: typeof message.date === "number" ? message.date : null,
    update,
  };
}

function parseUpdateTypes(value: string | undefined): string[] | null {
  const wanted = (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (wanted.length === 0) return null;
  const unknown = wanted.filter((t) => !UPDATE_TYPES.includes(t));
  if (unknown.length > 0) throw new Error(`Unknown Telegram update type: ${unknown.join(", ")}`);
  return [...new Set(wanted)];
}

interface WebhookInfo {
  url?: string;
}

export interface TelegramTriggerSpec {
  key: string;
  title: string;
  description: string;
  /** Update types Telegram is asked to deliver; omitted for the trigger whose types are a param. */
  allowedUpdates?: string[];
}

export function telegramTrigger(
  spec: TelegramTriggerSpec,
): TriggerDefinition<TriggerParams, TelegramEvent, TriggerState> {
  const fixed = spec.allowedUpdates;
  const params: Param[] = fixed ? [] : [{
    key: "updateTypes",
    label: "Update types",
    type: "string",
    advanced: true,
    hint:
      "Comma-separated Telegram update types, e.g. message,callback_query. Leave empty for Telegram's default set.",
  }];

  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    params,
    output: EVENT_OUTPUT,
    sample: fixed ? MESSAGE_SAMPLE : {
      ...MESSAGE_SAMPLE,
      updateType: "callback_query",
      text: "button-1",
      update: { update_id: 10000, callback_query: { id: "42", data: "button-1" } },
    },

    async onSubscribe({ params, callbackUrl }, ctx) {
      const allowedUpdates = fixed ?? parseUpdateTypes(params?.updateTypes);
      const client = new TelegramClient(ctx);
      const info = await client.call<WebhookInfo>("getWebhookInfo");
      if (info?.url && info.url !== callbackUrl) {
        throw new Error(
          "This bot already has a webhook set to another URL. A bot has one webhook, so w6w will not replace it; delete it first (deleteWebhook) or use a different bot.",
        );
      }
      const secretToken = randomSecret();
      const body: Record<string, unknown> = { url: callbackUrl, secret_token: secretToken };
      if (allowedUpdates) body.allowed_updates = allowedUpdates;
      await client.call("setWebhook", { method: "POST", body });
      return { secretToken, callbackUrl, allowedUpdates };
    },

    async onUnsubscribe({ state }, ctx) {
      const callbackUrl = (state as Partial<TriggerState> | undefined)?.callbackUrl;
      if (!callbackUrl) return;
      const client = new TelegramClient(ctx);
      const info = await client.call<WebhookInfo>("getWebhookInfo");
      // Gone already, or replaced by someone else's: nothing of ours to delete.
      if (info?.url !== callbackUrl) return;
      await client.call("deleteWebhook", { method: "POST", body: { drop_pending_updates: false } });
    },

    handleIngest({ raw, state }) {
      const secret = requireSecret((state as Partial<TriggerState> | undefined)?.secretToken);
      const body = requireRawBody(raw);
      const got = header(raw, "x-telegram-bot-api-secret-token");
      if (!got || !timingSafeEqual(secret, got)) {
        throw new Error("Telegram delivery refused: the secret token header is missing or wrong.");
      }
      let update: Record<string, unknown> | null;
      try {
        update = asObject(JSON.parse(body));
      } catch {
        update = null;
      }
      if (!update) throw new Error("Telegram delivery refused: the body is not a JSON object.");
      const event = normalize(update);
      if (!event) return [];
      const allowed = (state as Partial<TriggerState> | undefined)?.allowedUpdates;
      if (allowed && allowed.length > 0 && !allowed.includes(event.updateType)) return [];
      return [event];
    },

    parseOutput({ normalized }) {
      return normalized as TelegramEvent;
    },
  };
}
