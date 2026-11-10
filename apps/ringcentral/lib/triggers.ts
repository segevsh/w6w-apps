import type { HookContext, Param, TriggerDefinition } from "@w6w/types";
import { pollSinceWindow, type WindowState } from "./since-window.ts";
import callLogList from "../actions/call-log-list.ts";
import messageStoreList from "../actions/message-store-list.ts";
import { accountIdParam, extensionIdParam } from "./params.ts";

export const clock = { now: (): number => Date.now() };
const PAGE = 100;

interface MailboxParams {
  accountId?: string;
  extensionId?: string;
}
interface Row {
  id?: unknown;
  startTime?: unknown;
  creationTime?: unknown;
}

const params: Param[] = [accountIdParam, extensionIdParam];

function parseTime(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
}

/**
 * RingCentral documents no list order, so this relies on none: `dateFrom` selects the window, the
 * page number is persisted until `navigation.nextPage` is gone, and the id dedupe absorbs any row
 * that moves between pages. The call log is written when a call ends, so its window re-reads the
 * last 30 minutes; a message is stored as it is created, so 2 minutes are enough.
 */
function check(
  state: unknown,
  ctx: HookContext,
  overlapMs: number,
  stamp: "startTime" | "creationTime",
  list: (dateFrom: string, page: number) => unknown,
): Promise<{ events: unknown[]; nextState: WindowState }> {
  return pollSinceWindow<Row>({
    state,
    now: clock.now(),
    overlapMs,
    firstPos: 1,
    step: 1,
    maxPages: 2,
    maxEvents: 2 * PAGE,
    seenWindow: 500,
    idOf: (row) => String(row.id ?? ""),
    stampOf: (row) => parseTime(row[stamp]),
    async fetchPage(sinceMs, page) {
      const result = await list(new Date(sinceMs).toISOString(), page) as {
        records?: Row[];
        navigation?: { nextPage?: unknown };
      };
      return { items: result.records ?? [], more: Boolean(result.navigation?.nextPage) };
    },
  });
}

export const newCallLogRecordTrigger: TriggerDefinition<MailboxParams> = {
  key: "new-call-log-record",
  title: "New Call Log Record",
  description:
    "Runs when a call appears in the extension's call log. The run gets the call log record.",
  params,
  output: [
    { key: "id", type: "string", label: "Record ID" },
    { key: "startTime", type: "string", label: "Call start time" },
    { key: "direction", type: "string", label: "Direction" },
    { key: "result", type: "string", label: "Result" },
  ],
  sample: {
    id: "Dxv1L5sjCCkd6ZS",
    startTime: "2026-11-09T12:00:00.000Z",
    direction: "Inbound",
    result: "Accepted",
  },
  minIntervalMs: 300_000,
  poll({ params: p, state }, ctx) {
    return check(
      state,
      ctx,
      30 * 60_000,
      "startTime",
      (dateFrom, page) =>
        callLogList.execute({
          accountId: p.accountId,
          extensionId: p.extensionId,
          dateFrom,
          page,
          perPage: PAGE,
        }, ctx),
    );
  },
};

export const newMessageTrigger: TriggerDefinition<MailboxParams> = {
  key: "new-message",
  title: "New Message",
  description:
    "Runs when a message (SMS, voicemail, fax or pager) is created in the extension's mailbox. The run gets the message.",
  params,
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "creationTime", type: "string", label: "Created at" },
    { key: "direction", type: "string", label: "Direction" },
    { key: "type", type: "string", label: "Message type" },
  ],
  sample: {
    id: "1234567890",
    creationTime: "2026-11-09T12:00:00.000Z",
    direction: "Inbound",
    type: "SMS",
  },
  minIntervalMs: 300_000,
  poll({ params: p, state }, ctx) {
    return check(
      state,
      ctx,
      120_000,
      "creationTime",
      (dateFrom, page) =>
        messageStoreList.execute({
          accountId: p.accountId,
          extensionId: p.extensionId,
          availability: ["Alive"],
          dateFrom,
          page,
          perPage: PAGE,
        }, ctx),
    );
  },
};
