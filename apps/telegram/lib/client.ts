import type { HookContext } from "@w6w/types";

export const API_HOST = "https://api.telegram.org";

/**
 * Telegram carries the bot token in the URL **path** (`/bot<token>/sendMessage`),
 * not in a header. An Action must never see a credential, so the client builds
 * every URL with a literal placeholder segment and the auth `sign` hook — the
 * only code handed the credential — rewrites it into the real token.
 *
 * Keep this string in sync with `auth/bot-token.ts`; the two halves are a
 * contract and `tests/lib/client.test.ts` pins it.
 */
export const TOKEN_PLACEHOLDER = "bot{token}";

/** Base every Bot API method hangs off, with the token slot still unfilled. */
export const API_URL = `${API_HOST}/${TOKEN_PLACEHOLDER}`;

/**
 * Telegram always answers 200 with an envelope; failures are signalled by
 * `ok: false` in the body rather than the HTTP status, so both have to be
 * checked. `result` is the payload callers actually want.
 */
export interface TelegramEnvelope<T = unknown> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export interface RequestOptions {
  method?: string;
  /** JSON body. Telegram accepts `application/json` for every method we call. */
  body?: Record<string, unknown>;
  /** Query string, used by the GET-shaped methods (`getFile`, `getChat`, …). */
  query?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Drop keys the caller left unset so optional params don't reach the API as
 * nulls. `undefined`/`null` only — an empty string is a real value that some
 * methods need (`setChatDescription` clears the description with one). Actions
 * whose blank form input means "unset" run it through {@link unset} first.
 */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

/** Treat a blank form field as absent. */
export function unset(v: string | undefined): string | undefined {
  return v === "" ? undefined : v;
}

/**
 * Thin wrapper over `ctx.fetch`. It never sets Authorization and never fills
 * the token slot — the runtime routes each request through `sign` first.
 */
export class TelegramClient {
  constructor(private ctx: HookContext) {}

  async call<T = unknown>(method: string, options: RequestOptions = {}): Promise<T> {
    const url = new URL(`${API_URL}/${method}`);
    for (const [k, v] of Object.entries(options.query ?? {})) {
      if (v === undefined || v === null || v === "") continue;
      url.searchParams.set(k, String(v));
    }

    const init: RequestInit = { method: options.method ?? (options.body ? "POST" : "GET") };
    if (options.body) {
      init.headers = { "content-type": "application/json" };
      init.body = JSON.stringify(compact(options.body));
    }

    const res = await this.ctx.fetch(url.toString(), init);
    let envelope: TelegramEnvelope<T>;
    try {
      envelope = await res.json() as TelegramEnvelope<T>;
    } catch {
      throw new Error(`Telegram ${res.status} ${res.statusText} for ${method}: non-JSON response`);
    }
    // A Bot API error is a 4xx *and* `ok: false`; guard on both so a proxy that
    // rewrites the status can't make a failure look like a success.
    if (!res.ok || !envelope.ok) {
      const code = envelope.error_code ?? res.status;
      throw new Error(`Telegram ${code} for ${method}: ${envelope.description ?? res.statusText}`);
    }
    return envelope.result as T;
  }
}

/**
 * Params shared by every `send*` method. Declared once so the ~10 send actions
 * stay consistent instead of each re-deriving Telegram's option set.
 */
export interface SendCommon {
  chatId: string;
  replyToMessageId?: number;
  disableNotification?: boolean;
  protectContent?: boolean;
  messageThreadId?: number;
  replyMarkup?: unknown;
}

export function sendCommonBody(input: SendCommon): Record<string, unknown> {
  return {
    chat_id: input.chatId,
    message_thread_id: input.messageThreadId,
    disable_notification: input.disableNotification,
    protect_content: input.protectContent,
    reply_parameters: input.replyToMessageId ? { message_id: input.replyToMessageId } : undefined,
    reply_markup: input.replyMarkup,
  };
}
