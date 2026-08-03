import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";
import apiKey from "./auth/api-key.ts";
import search from "./actions/search.ts";
import getVideos from "./actions/get-videos.ts";
import updateVideo from "./actions/update-video.ts";
import deleteVideo from "./actions/delete-video.ts";
import rateVideo from "./actions/rate-video.ts";
import getChannels from "./actions/get-channels.ts";
import listPlaylists from "./actions/list-playlists.ts";
import createPlaylist from "./actions/create-playlist.ts";
import updatePlaylist from "./actions/update-playlist.ts";
import deletePlaylist from "./actions/delete-playlist.ts";
import listPlaylistItems from "./actions/list-playlist-items.ts";
import addPlaylistItem from "./actions/add-playlist-item.ts";
import removePlaylistItem from "./actions/remove-playlist-item.ts";
import listCommentThreads from "./actions/list-comment-threads.ts";
import replyToComment from "./actions/reply-to-comment.ts";
import listSubscriptions from "./actions/list-subscriptions.ts";
import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    search,
    getVideos,
    updateVideo,
    deleteVideo,
    rateVideo,
    getChannels,
    listPlaylists,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    listPlaylistItems,
    addPlaylistItem,
    removePlaylistItem,
    listCommentThreads,
    replyToComment,
    listSubscriptions,
  ],
  auth: [oauth2, apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
