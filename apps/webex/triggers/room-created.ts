import { MESSAGE_SAMPLE, webexTrigger } from "../lib/triggers.ts";

/** A space created by the connected account or one of its integrations (`rooms` / `created`). */
const roomCreated = webexTrigger({
  key: "room-created",
  title: "Space Created",
  description:
    "Fires when a Webex space is created by the connected account or one of its integrations (Webex sends no event for spaces other people create; New Space polls for those). The run gets the space id, title and type.",
  resource: "rooms",
  event: "created",
  sample: {
    ...MESSAGE_SAMPLE,
    resource: "rooms",
    text: null,
    message: null,
    roomId: "Y2lzY29zcGFyazovL3VzL1JPT00vYmJjZWIxYWQtNDNmMS0zYjU4LTkxNDctZjE0YmIwYzRkMTU0",
    personId: null,
    personEmail: null,
    id: "Y2lzY29zcGFyazovL3VzL1JPT00vYmJjZWIxYWQtNDNmMS0zYjU4LTkxNDctZjE0YmIwYzRkMTU0",
    data: {
      id: "Y2lzY29zcGFyazovL3VzL1JPT00vYmJjZWIxYWQtNDNmMS0zYjU4LTkxNDctZjE0YmIwYzRkMTU0",
      title: "Project Unicorn",
      type: "group",
      isLocked: false,
    },
  },
});

export default roomCreated;
