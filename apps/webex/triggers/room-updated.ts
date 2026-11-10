import { MESSAGE_SAMPLE, webexTrigger } from "../lib/triggers.ts";

/** A space the connected account is in was changed (`rooms` / `updated`). */
const roomUpdated = webexTrigger({
  key: "room-updated",
  title: "Space Updated",
  description:
    "Fires when a Webex space the connection is in is updated, mainly when it is locked or unlocked. The run gets the space id, title, type and lock state.",
  resource: "rooms",
  event: "updated",
  sample: {
    ...MESSAGE_SAMPLE,
    resource: "rooms",
    event: "updated",
    text: null,
    message: null,
    personId: null,
    personEmail: null,
    roomId: "Y2lzY29zcGFyazovL3VzL1JPT00vYmJjZWIxYWQtNDNmMS0zYjU4LTkxNDctZjE0YmIwYzRkMTU0",
    id: "Y2lzY29zcGFyazovL3VzL1JPT00vYmJjZWIxYWQtNDNmMS0zYjU4LTkxNDctZjE0YmIwYzRkMTU0",
    data: {
      id: "Y2lzY29zcGFyazovL3VzL1JPT00vYmJjZWIxYWQtNDNmMS0zYjU4LTkxNDctZjE0YmIwYzRkMTU0",
      title: "Project Unicorn",
      type: "group",
      isLocked: true,
    },
  },
});

export default roomUpdated;
