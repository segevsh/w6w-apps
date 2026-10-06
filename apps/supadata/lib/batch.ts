import type { Param } from "@w6w/types";
import { compact, toList } from "./client.ts";

export interface BatchSource {
  videoIds?: string[] | string;
  playlistId?: string;
  channelId?: string;
  limit?: number;
}

/** The three mutually exclusive sources of a YouTube batch job. */
export const batchSourceParams: Param[] = [
  {
    key: "videoIds",
    label: "Video ids or URLs",
    type: "text",
    hint: "One per line. Give exactly one of videos, playlist or channel.",
  },
  { key: "playlistId", label: "Playlist URL or id", type: "string" },
  { key: "channelId", label: "Channel URL, handle or id", type: "string" },
  {
    key: "limit",
    label: "Max videos",
    type: "number",
    default: 10,
    validation: { integer: true, min: 1, max: 5000 },
    hint: "For a playlist or channel. Regular videos only (Shorts and live streams are skipped).",
  },
];

export function batchSource(input: BatchSource): Record<string, unknown> {
  const videoIds = toList(input.videoIds);
  const playlistId = input.playlistId?.trim();
  const channelId = input.channelId?.trim();
  const given = [videoIds.length > 0, !!playlistId, !!channelId].filter(Boolean).length;
  if (given !== 1) throw new Error("Give exactly one of video ids, a playlist or a channel");
  return compact({ videoIds, playlistId, channelId, limit: input.limit });
}
