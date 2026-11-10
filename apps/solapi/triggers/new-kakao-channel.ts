import listKakaoChannels from "../actions/list-kakao-channels.ts";
import { readCursor, snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c) over `list-kakao-channels`: GET /kakao/v2/channels is cursor-paged (`limit`, `startKey`/`nextKey`) and lists the account's linked channels, a small set that is read whole.
 */
export default snapshotTrigger({
  key: "new-kakao-channel",
  title: "New Kakao Channel",
  description: "The run gets each Kakao channel newly linked to the account.",
  output: [
    { key: "channelId", type: "string", label: "Channel ID (pfId)" },
    { key: "searchId", type: "string", label: "Channel handle" },
    { key: "phoneNumber", type: "string", label: "Phone number" },
    { key: "dateCreated", type: "string", label: "Created at" },
  ],
  sample: {
    channelId: "channel-101",
    searchId: "@example",
    phoneNumber: "01000000000",
    dateCreated: "2026-11-09T09:00:00.000Z",
  },
  rows: (ctx) => {
    return readCursor("new-kakao-channel", listKakaoChannels, ctx);
  },
  idOf: (r) => String(r.channelId ?? ""),
});
