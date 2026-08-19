import type { ActionDefinition } from "@w6w/types";
import {
  byteLength,
  MAX_EVENT_DATA_BYTES,
  MAX_EVENT_NAME_BYTES,
  ParticleClient,
} from "../lib/client.ts";

/**
 * `POST /v1/devices/events` — publish an event into the Particle cloud.
 *
 * ## A public event is visible to every Particle account, everywhere
 *
 * This is the property worth stopping at. `private=false` publishes onto the
 * **public event stream**, which any Particle user in the world can subscribe
 * to. Not "anyone with the link" — anyone at all, and there is no way to recall
 * an event once published.
 *
 * There are real uses for it, and none of them are a workflow's telemetry. So
 * this action defaults to private and gates public, which is the reverse of
 * Particle's own API default.
 *
 * ## Devices subscribe to this, which is what makes it useful
 *
 * Firmware calling `Particle.subscribe` receives events published here. That is
 * how a workflow reaches a fleet without calling each device: one publish,
 * every subscribed device. It is also fire-and-forget — nothing reports which
 * devices received it, or whether any did.
 *
 * ## Two byte limits, and both truncate quietly at the device
 *
 * A name is capped at 64 bytes and data at 1024. They are checked here, in
 * bytes rather than characters, because a device receiving a truncated payload
 * has no way to know it was truncated.
 */
const action: ActionDefinition = {
  key: "event-publish",
  type: "perform",
  resource: "event",
  title: "Publish an event",
  description:
    "Publish an event that subscribed devices receive — one call reaches a whole fleet. PUBLIC " +
    "events are visible to every Particle account in the world and cannot be recalled, so this " +
    "defaults to private, unlike the API.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Event Name",
      type: "string",
      required: true,
      default: "",
      hint: "Up to 64 bytes. Firmware subscribes by name or by prefix.",
    },
    {
      key: "data",
      label: "Data",
      type: "string",
      default: "",
      hint: "Up to 1024 bytes. A device receiving a truncated payload cannot tell that it was.",
    },
    {
      key: "private",
      label: "Private",
      type: "boolean",
      default: true,
      hint: "ON by default here, against the API. Off publishes to the PUBLIC stream, which " +
        "every Particle user can subscribe to and which cannot be recalled.",
    },
    {
      key: "confirmPublic",
      label: "I am publishing this to every Particle user",
      type: "boolean",
      default: false,
      showIf: { "==": [{ var: "private" }, false] },
    },
    {
      key: "ttl",
      label: "TTL (seconds)",
      type: "number",
      default: 60,
      advanced: true,
    },
  ],
  output: [
    { key: "published", type: "boolean", label: "Whether Particle accepted it" },
    { key: "name", type: "string", label: "The event name" },
    { key: "private", type: "boolean", label: "Whether it went to the private stream" },
    { key: "dataBytes", type: "number", label: "How large the payload was" },
    { key: "delivered", type: "boolean", label: "Always unknown — publishing is fire-and-forget" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    const nameBytes = byteLength(name);
    if (nameBytes > MAX_EVENT_NAME_BYTES) {
      throw new Error(
        `the event name is ${nameBytes} bytes and Particle's limit is ${MAX_EVENT_NAME_BYTES}`,
      );
    }
    const data = String(p.data ?? "");
    const dataBytes = byteLength(data);
    if (dataBytes > MAX_EVENT_DATA_BYTES) {
      throw new Error(
        `the payload is ${dataBytes} bytes and Particle's limit is ${MAX_EVENT_DATA_BYTES}. ` +
          "It would be truncated, and a device receiving it could not tell that it had been",
      );
    }

    const isPrivate = p.private !== false;
    if (!isPrivate && p.confirmPublic !== true) {
      throw new Error(
        "set `confirmPublic` — a public event goes onto the stream every Particle account in " +
          "the world can subscribe to, and there is no way to recall it once published",
      );
    }

    await new ParticleClient(ctx).request("/v1/devices/events", {
      method: "POST",
      form: {
        name,
        data,
        private: isPrivate,
        ttl: Math.max(1, Number(p.ttl ?? 60)),
      },
    });

    // The name and the size. Never the payload — it is whatever the workflow
    // is telling a fleet, and that is the caller's data.
    ctx.log(
      isPrivate ? "info" : "warn",
      isPrivate
        ? "published a private Particle event"
        : "published a PUBLIC Particle event — visible to every Particle account",
      { name, dataBytes },
    );

    return {
      published: true,
      name,
      private: isPrivate,
      dataBytes,
      // Nothing reports which devices received it, or whether any did.
      delivered: undefined,
    };
  },
};

export default action;
