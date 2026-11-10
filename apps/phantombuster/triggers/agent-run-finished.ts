import type { OutputField, TriggerDefinition } from "@w6w/types";

/**
 * PhantomBuster "agent run finished" webhook (rfcs/trigger.md, webhook form, manual).
 *
 * PhantomBuster POSTs a JSON summary to the webhook URL set on an agent (setup page, Settings,
 * Advanced Notification Settings) whenever a run of that agent ends. That covers every run, not only
 * ones started through this app (the docs: called "at the end of an agent's execution").
 *
 *   - `onSubscribe` makes no PhantomBuster call (the URL is entered by hand per agent; the docs
 *     describe no registration endpoint) and hands back the `callbackUrl` the user pastes there.
 *   - `handleIngest` turns the POST into one event.
 *
 * Trust model: PhantomBuster does not sign deliveries and cannot send custom request headers; the
 * only secret its docs offer is one carried in the URL's query string. So the callback URL w6w
 * minted for the subscription IS the secret: anyone holding it can post a fake run. There is
 * nothing to verify, and this trigger does not pretend to.
 *
 * Docs (verified 2026-11-10): https://hub.phantombuster.com/docs/using-webhooks
 */

export interface AgentRunEvent {
  agentId: string | null;
  agentName: string | null;
  containerId: string | null;
  script: string | null;
  scriptOrg: string | null;
  branch: string | null;
  launchDuration: number | null;
  runDuration: number | null;
  exitCode: number | null;
  exitMessage: string | null;
  succeeded: boolean | null;
  resultObject: unknown;
}

const OUTPUT: OutputField[] = [
  { key: "agentId", type: "string", label: "Agent ID" },
  { key: "agentName", type: "string", label: "Agent Name" },
  { key: "containerId", type: "string", label: "Container ID" },
  { key: "script", type: "string", label: "Script" },
  { key: "scriptOrg", type: "string", label: "Script Org" },
  { key: "branch", type: "string", label: "Branch" },
  { key: "launchDuration", type: "number", label: "Launch Duration (ms)" },
  { key: "runDuration", type: "number", label: "Run Duration (ms)" },
  { key: "exitCode", type: "number", label: "Exit Code" },
  { key: "exitMessage", type: "string", label: "Exit Message" },
  { key: "succeeded", type: "boolean", label: "Succeeded (exit code 0)" },
  { key: "resultObject", type: "object", label: "Result Object" },
];

const SAMPLE: AgentRunEvent = {
  agentId: "5027055349780535",
  agentName: "Test Script",
  containerId: "3358014727012763",
  script: "test_script.js",
  scriptOrg: "phantombuster",
  branch: "master",
  launchDuration: 121,
  runDuration: 1850,
  exitCode: 0,
  exitMessage: "finished",
  succeeded: true,
  resultObject: { profilesScraped: 42 },
};

function str(v: unknown): string | null {
  return typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** The POST body → one event. Throws on anything that is not a PhantomBuster run summary. */
export function normalizeDelivery(body: unknown): AgentRunEvent {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Not a PhantomBuster webhook delivery: expected a JSON object.");
  }
  const b = body as Record<string, unknown>;
  const agentId = str(b.agentId);
  const containerId = str(b.containerId);
  if (!agentId || !containerId) {
    throw new Error("Not a PhantomBuster webhook delivery: expected agentId and containerId.");
  }
  const exitCode = num(b.exitCode);
  return {
    agentId,
    agentName: str(b.agentName),
    containerId,
    script: str(b.script),
    scriptOrg: str(b.scriptOrg),
    branch: str(b.branch),
    launchDuration: num(b.launchDuration),
    runDuration: num(b.runDuration),
    exitCode,
    exitMessage: str(b.exitMessage),
    succeeded: exitCode === null ? null : exitCode === 0,
    resultObject: b.resultObject ?? null,
  };
}

const agentRunFinished: TriggerDefinition<
  Record<string, never>,
  AgentRunEvent,
  { callbackUrl: string }
> = {
  key: "agent-run-finished",
  title: "Agent Run Finished",
  description:
    "Fires when a run of a PhantomBuster agent ends, whether it finished, failed or was killed. The run gets the agent and container ids, script, durations, exit code and message, and the result object.",
  output: OUTPUT,
  sample: SAMPLE,

  onSubscribe({ callbackUrl }) {
    return { callbackUrl };
  },

  onUnsubscribe() {},

  handleIngest({ raw }) {
    if (raw.method.toUpperCase() !== "POST") {
      throw new Error(`PhantomBuster delivers webhooks with POST, not ${raw.method}.`);
    }
    return [normalizeDelivery(raw.body)];
  },
};

export default agentRunFinished;
