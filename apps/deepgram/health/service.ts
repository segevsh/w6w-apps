/**
 * Is Deepgram up? — its Statuspage, read per component.
 *
 * Verified 2026-08-18: `status.deepgram.com` is a Statuspage instance named
 * "Deepgram" (page id `psgp8bbm9l61`) publishing components including
 * `Batch API`, `Streaming API`, `TTS API`, `Usage API`, `Management APIs` and
 * `Voice Agent API`.
 *
 * ## The split that matters here
 *
 * Deepgram's surfaces fail independently, and this app only uses some of them.
 * **Batch** is what `audio-transcribe` and `text-analyze` call, **TTS** is
 * `speech-generate`, and **Management** and **Usage** are everything else. So
 * all four count towards the verdict and are reported by name — a TTS outage
 * with a healthy batch API is a real, partial answer that a single roll-up
 * would flatten.
 *
 * **Streaming** and **Voice Agent** are deliberately not counted: they are
 * WebSocket surfaces this app cannot reach at all, and an outage there says
 * nothing about whether these actions will work.
 */
import type { HealthCheckDefinition, HealthState } from "@w6w/types";
import { worstHealthState } from "@w6w/types";

const STATUS_HOST = "status.deepgram.com";

/** Statuspage's component vocabulary, mapped onto our four states. */
const STATES: Record<string, HealthState> = {
  operational: "ok",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

/** The surfaces this app actually calls. */
const USED = [
  /^batch api$/i,
  /^tts api$/i,
  /^usage api$/i,
  /^management apis?$/i,
  /^deepgram public api/i,
];

const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const service: HealthCheckDefinition = {
  key: "service",
  title: "Deepgram platform status",
  description:
    "The batch, TTS, usage and management surfaces this app calls. Streaming and Voice Agent are " +
    "WebSocket surfaces it cannot reach, so their outages do not count.",
  kind: "service",
  covers: ["*"],
  network: { allow: [STATUS_HOST] },
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const res = await ctx.fetch(`https://${STATUS_HOST}/api/v2/components.json`);
    // `unknown`, never `down`: a status page that itself fails tells us nothing.
    if (!res.ok) return { state: "unknown", message: `status page returned ${res.status}` };

    const body = await res.json().catch(() => null) as
      | { components?: Array<{ name?: string; status?: string; group?: boolean }> }
      | null;
    if (!Array.isArray(body?.components)) {
      return { state: "unknown", message: "status page returned an unexpected shape" };
    }

    const components: Record<string, { state: HealthState; message?: string }> = {};
    const states: HealthState[] = [];
    const bad: string[] = [];

    for (const c of body.components) {
      if (c.group === true) continue;
      const name = String(c.name ?? "");
      if (!USED.some((re) => re.test(name))) continue;
      const state = STATES[String(c.status)] ?? "unknown";
      components[slug(name)] = { state, message: c.status };
      states.push(state);
      if (c.status !== "operational") bad.push(`${name}: ${c.status}`);
    }

    if (states.length === 0) {
      return {
        state: "unknown",
        message: "the status page no longer names the surfaces this app uses",
      };
    }

    return {
      state: worstHealthState(states),
      message: bad.length === 0 ? `${states.length} surfaces operational` : bad.join("; "),
      components,
      ttlSeconds: 120,
    };
  },
};

export default service;
