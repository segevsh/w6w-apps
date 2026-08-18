import type { ActionDefinition } from "@w6w/types";
import { MastodonClient } from "../lib/client.ts";

/**
 * `GET /api/v2/instance` — what this server is and what it allows.
 *
 * ## The limits every other action has to respect
 *
 * `configuration.statuses.max_characters`, `max_media_attachments`,
 * `polls.max_options`, and the accepted MIME types. All per-instance, all
 * different across the network, and all reported here. This is where the
 * connection's recorded limits come from, and running it again is how to notice
 * an instance raised its character limit.
 *
 * ## `rules` is the part a workflow author should read
 *
 * Every instance publishes its rules, and a great many of them say something
 * about automated posting — some welcome bots on condition they are labelled,
 * some ban them outright. Pointing a workflow at somebody else's server without
 * reading these is how an account gets suspended, and this is the endpoint that
 * returns them.
 *
 * ## v1 is deprecated and shaped differently
 *
 * `/api/v1/instance` still answers on most servers and returns a flatter
 * object with the limits in different places. Code written against it breaks
 * quietly when a server finally removes it. This uses v2.
 */
const action: ActionDefinition = {
  key: "instance-get",
  type: "read",
  resource: "instance",
  title: "Get instance information",
  description:
    "What this server allows — the character limit, media count and poll options every other " +
    "action respects, plus the rules, which usually say something about automated posting.",
  params: [],
  output: [
    { key: "instance", type: "object", label: "The full response" },
    { key: "domain", type: "string", label: "Its domain" },
    { key: "version", type: "string", label: "Which Mastodon it runs" },
    { key: "maxCharacters", type: "number", label: "The post length limit" },
    { key: "maxMedia", type: "number", label: "Attachments per post" },
    { key: "rules", type: "array", label: "The server's own rules" },
    { key: "registrations", type: "boolean", label: "Whether it is open to new accounts" },
  ],

  async execute(_input, ctx) {
    const instance = await new MastodonClient(ctx).request<{
      domain?: string;
      version?: string;
      rules?: Array<{ id?: string; text?: string }>;
      registrations?: { enabled?: boolean };
      configuration?: {
        statuses?: { max_characters?: number; max_media_attachments?: number };
      };
    }>("/api/v2/instance");

    return {
      instance,
      domain: instance?.domain,
      version: instance?.version,
      maxCharacters: instance?.configuration?.statuses?.max_characters,
      maxMedia: instance?.configuration?.statuses?.max_media_attachments,
      // Worth reading before automating anything against somebody else's server.
      rules: instance?.rules ?? [],
      registrations: instance?.registrations?.enabled === true,
    };
  },
};

export default action;
