import { MESSAGE_SAMPLE, webexTrigger } from "../lib/triggers.ts";

/** Someone left or was removed from a group space (`memberships` / `deleted`). */
const membershipDeleted = webexTrigger({
  key: "membership-deleted",
  title: "Space Member Removed",
  description:
    "Fires when someone leaves or is removed from a Webex group space the connection is in (Webex does not send it for 1:1 spaces). The run gets the space and the person.",
  resource: "memberships",
  event: "deleted",
  sample: {
    ...MESSAGE_SAMPLE,
    resource: "memberships",
    event: "deleted",
    text: null,
    message: null,
    data: {
      id: "Y2lzY29zcGFyazovL3VzL01FTUJFUlNISVAv",
      roomId: MESSAGE_SAMPLE.roomId,
      personId: MESSAGE_SAMPLE.personId,
    },
  },
});

export default membershipDeleted;
