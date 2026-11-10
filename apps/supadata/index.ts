/**
 * Supadata — transcripts, media metadata, AI video extraction and web scraping over the REST API
 * at `api.supadata.ai/v1`. See `README.md` and `lib/client.ts` for what was verified.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";
import transcriptGet from "./actions/transcript-get.ts";
import transcriptJobGet from "./actions/transcript-job-get.ts";
import metadataGet from "./actions/metadata-get.ts";
import extractStart from "./actions/extract-start.ts";
import extractJobGet from "./actions/extract-job-get.ts";
import webScrape from "./actions/web-scrape.ts";
import webMap from "./actions/web-map.ts";
import webCrawlStart from "./actions/web-crawl-start.ts";
import webCrawlGet from "./actions/web-crawl-get.ts";
import youtubeSearch from "./actions/youtube-search.ts";
import youtubeChannelGet from "./actions/youtube-channel-get.ts";
import youtubeChannelVideos from "./actions/youtube-channel-videos.ts";
import youtubePlaylistGet from "./actions/youtube-playlist-get.ts";
import youtubePlaylistVideos from "./actions/youtube-playlist-videos.ts";
import youtubeTranscriptTranslate from "./actions/youtube-transcript-translate.ts";
import youtubeTranscriptBatchStart from "./actions/youtube-transcript-batch-start.ts";
import youtubeVideoBatchStart from "./actions/youtube-video-batch-start.ts";
import youtubeBatchGet from "./actions/youtube-batch-get.ts";
import accountGet from "./actions/account-get.ts";
import service from "./health/service.ts";
import api from "./health/api.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    transcriptGet,
    transcriptJobGet,
    metadataGet,
    extractStart,
    extractJobGet,
    webScrape,
    webMap,
    webCrawlStart,
    webCrawlGet,
    youtubeSearch,
    youtubeChannelGet,
    youtubeChannelVideos,
    youtubePlaylistGet,
    youtubePlaylistVideos,
    youtubeTranscriptTranslate,
    youtubeTranscriptBatchStart,
    youtubeVideoBatchStart,
    youtubeBatchGet,
    accountGet,
  ],
  auth: [apiKey],
  healthChecks: [service, api, quota],
} satisfies AppDefinition;
