import { MESSAGE_SAMPLE, webexTrigger } from "../lib/triggers.ts";

/** A membership changed in a space the connected account is in (`memberships` / `updated`). */
const membershipUpdated = webexTrigger({
  key: "membership-updated",
  title: "Space Member Updated",
  description:
    "Fires when someone's membership changes in a Webex space the connection can see, mainly when they are made or stop being a moderator. The run gets the space and the person.",
  resource: "memberships",
  event: "updated",
  sample: {
    ...MESSAGE_SAMPLE,
    resource: "memberships",
    event: "updated",
    text: null,
    message: null,
    data: {
      id: "Y2lzY29zcGFyazovL3VzL01FTUJFUlNISVAv",
      roomId: MESSAGE_SAMPLE.roomId,
      personId: MESSAGE_SAMPLE.personId,
      isModerator: true,
    },
  },
});

export default membershipUpdated;
