import { MESSAGE_SAMPLE, webexTrigger } from "../lib/triggers.ts";

/** Someone added to a space the connected account is in. */
const newMembership = webexTrigger({
  key: "new-membership",
  title: "New Space Member",
  description:
    "Fires when someone is added to a Webex space the connection can see. The run gets the space and the person who joined.",
  resource: "memberships",
  event: "created",
  sample: {
    ...MESSAGE_SAMPLE,
    resource: "memberships",
    text: null,
    message: null,
    data: { id: "Y2lzY29zcGFyazovL3VzL01FTUJFUlNISVAv", roomId: MESSAGE_SAMPLE.roomId },
  },
});

export default newMembership;
