import type { HookContext, TriggerDefinition } from "@w6w/types";
import { pollSinceWindow, type WindowState } from "./since-window.ts";
import storySearch from "../actions/story-search.ts";

export const clock = { now: (): number => Date.now() };
const OVERLAP_MS = 120_000;

interface Story {
  id?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
}

function parseTime(value: unknown): number | undefined {
  if (typeof value !== "string") return undefined;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? undefined : ms;
}

/**
 * `POST /stories/search` answers one unpaged array, so a window is one request. The array is sorted
 * oldest-first here (never trusting the vendor's order); when more than `maxEvents` stories are
 * unseen the oldest are emitted and the window resumes from the last emitted timestamp.
 */
function check(
  state: unknown,
  ctx: HookContext,
  updated: boolean,
): Promise<{ events: unknown[]; nextState: WindowState }> {
  const stamp = updated ? "updated_at" : "created_at";
  return pollSinceWindow<Story>({
    state,
    now: clock.now(),
    overlapMs: OVERLAP_MS,
    firstPos: 0,
    step: 0,
    maxPages: 1,
    maxEvents: 100,
    seenWindow: 500,
    idOf: (story) =>
      updated ? `${story.id ?? ""}:${story.updated_at ?? ""}` : String(story.id ?? ""),
    stampOf: (story) => parseTime(story[stamp]),
    async fetchPage(sinceMs) {
      const since = new Date(sinceMs).toISOString();
      const result = await storySearch.execute(
        updated ? { updatedAtStart: since } : { createdAtStart: since },
        ctx,
      ) as Story[];
      const items = (Array.isArray(result) ? result : [])
        .map((story, i) => ({ story, i, ms: parseTime(story[stamp]) ?? 0 }))
        .sort((a, b) => a.ms - b.ms || a.i - b.i)
        .map((e) => e.story);
      return { items, more: false };
    },
  });
}

export const newStoryTrigger: TriggerDefinition = {
  key: "new-story",
  title: "New Story",
  description: "Runs when a story is created in Shortcut. The run gets the story.",
  output: [
    { key: "id", type: "number", label: "Story ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "story_type", type: "string", label: "Story type" },
  ],
  sample: {
    id: 1234,
    name: "Fix the login redirect",
    created_at: "2026-11-09T12:00:00Z",
    story_type: "feature",
  },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return check(state, ctx, false);
  },
};

export const newOrUpdatedStoryTrigger: TriggerDefinition = {
  key: "new-or-updated-story",
  title: "New or Updated Story",
  description: "Runs when a story is created or updated in Shortcut. The run gets the story.",
  output: [
    { key: "id", type: "number", label: "Story ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "updated_at", type: "string", label: "Updated at" },
    { key: "story_type", type: "string", label: "Story type" },
  ],
  sample: {
    id: 1234,
    name: "Fix the login redirect",
    updated_at: "2026-11-09T12:00:00Z",
    story_type: "feature",
  },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return check(state, ctx, true);
  },
};
