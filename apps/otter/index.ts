/**
 * Otter.ai — AI meeting transcripts, summaries, action items and insights.
 *
 * Otter's Public API is a small, flat REST surface — one host
 * (`api.otter.ai/v1`), Bearer auth, cursor pagination — gated to Enterprise
 * workspaces only (docs: "Otter's Public API is available for all Enterprise
 * workspaces. If you do not see this feature for your workspace, contact
 * your Otter account manager"). See `lib/client.ts` for how the docs
 * themselves were read (the rendered help-center page 403s to every UA; the
 * Zendesk Help Center JSON API does not).
 *
 * Every documented endpoint is covered by an Action:
 *
 *   - Channels: list channels, list a channel's members.
 *   - Conversations: list, get one (with optional action items / insights /
 *     outline / transcript via `include`), get its MP3 audio link, and
 *     create one from a publicly downloadable file URL.
 *   - Workspace: get the authenticated user's workspace.
 *
 * Deliberately absent: Webhooks. The docs name webhooks as "the recommended
 * way to build export integrations with Otter" — but that is a push/Trigger
 * surface (`onSubscribe`/`handleIngest`), not a poll a `read` Action can
 * wrap, and the starter template this app follows does not include triggers.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import channelList from "./actions/channel-list.ts";
import channelMembersList from "./actions/channel-members-list.ts";

import conversationList from "./actions/conversation-list.ts";
import conversationGet from "./actions/conversation-get.ts";
import conversationAudioGet from "./actions/conversation-audio-get.ts";
import conversationCreate from "./actions/conversation-create.ts";

import workspaceGet from "./actions/workspace-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    channelList,
    channelMembersList,
    conversationList,
    conversationGet,
    conversationAudioGet,
    conversationCreate,
    workspaceGet,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
