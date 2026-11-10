import type { Param } from "@w6w/types";
import { anyEventTrigger } from "../lib/triggers.ts";

const EVENTS: Param = {
  key: "events",
  label: "Events",
  type: "string",
  hint:
    "Comma-separated Heartbeat event names (USER_JOIN, USER_UPDATE, EVENT_CREATE, EVENT_RSVP, THREAD_CREATE, DIRECT_MESSAGE, COURSE_COMPLETED, GROUP_JOIN, ABANDONED_CART, DOCUMENT_CREATE). Empty = every event that needs no filter, plus each filtered event whose id field below is filled in. MENTION has its own trigger.",
};

const channelId: Param = {
  key: "channelId",
  label: "Channel ID (for THREAD_CREATE)",
  type: "string",
  hint: "Required when THREAD_CREATE is listed; with Events empty it adds THREAD_CREATE.",
};
const groupId: Param = {
  key: "groupId",
  label: "Group ID (for GROUP_JOIN)",
  type: "string",
  hint: "Required when GROUP_JOIN is listed; with Events empty it adds GROUP_JOIN.",
};
const courseId: Param = {
  key: "courseId",
  label: "Course ID (for COURSE_COMPLETED)",
  type: "string",
  hint: "Required when COURSE_COMPLETED is listed; with Events empty it adds COURSE_COMPLETED.",
};
const userId: Param = {
  key: "userId",
  label: "Admin user ID (for DIRECT_MESSAGE)",
  type: "string",
  hint: "Required when DIRECT_MESSAGE is listed; with Events empty it adds DIRECT_MESSAGE.",
};

/** Any Heartbeat webhook action, one webhook registered per chosen event. */
const anyEvent = anyEventTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires for the Heartbeat events you list (or every event that needs no filter when the list is empty). Heartbeat registers one action per webhook, so this registers one webhook per event. The run gets the action name plus that event's own payload fields.",
  params: [EVENTS, channelId, groupId, courseId, userId],
  output: [
    {
      key: "id",
      type: "string",
      label: "Record ID (USER_JOIN, USER_UPDATE, EVENT_CREATE, THREAD_CREATE, DOCUMENT_CREATE)",
    },
    { key: "name", type: "string", label: "Name (USER_JOIN)" },
    { key: "email", type: "string", label: "Email (USER_JOIN, EVENT_RSVP, ABANDONED_CART)" },
    { key: "channelID", type: "string", label: "Channel ID (THREAD_CREATE)" },
    { key: "eventID", type: "string", label: "Event ID (EVENT_RSVP)" },
    { key: "userID", type: "string", label: "User ID (EVENT_RSVP, COURSE_COMPLETED, GROUP_JOIN)" },
    { key: "groupID", type: "string", label: "Group ID (GROUP_JOIN)" },
    { key: "courseID", type: "string", label: "Course ID (COURSE_COMPLETED)" },
    { key: "courseName", type: "string", label: "Course name (COURSE_COMPLETED)" },
    { key: "senderUserID", type: "string", label: "Sender user ID (DIRECT_MESSAGE)" },
    { key: "receiverUserID", type: "string", label: "Receiver user ID (DIRECT_MESSAGE)" },
    { key: "chatID", type: "string", label: "Direct chat ID (DIRECT_MESSAGE)" },
    { key: "chatMessageID", type: "string", label: "Chat message ID (DIRECT_MESSAGE)" },
    { key: "invitationLinkID", type: "string", label: "Invitation link ID (ABANDONED_CART)" },
    { key: "groupIDs", type: "array", label: "Group IDs (ABANDONED_CART)" },
  ],
  // One USER_JOIN delivery. Each event carries only its own fields, so the fields this event does
  // not carry are shown as null (the output list is the union over all events).
  sample: {
    action: "USER_JOIN",
    id: "e6ccb009-ad46-4b09-a6e9-1412d9ff0601",
    name: "Sample Member",
    email: "member@example.com",
    channelID: null,
    eventID: null,
    userID: null,
    groupID: null,
    courseID: null,
    courseName: null,
    senderUserID: null,
    receiverUserID: null,
    chatID: null,
    chatMessageID: null,
    invitationLinkID: null,
    groupIDs: null,
  },
});

export default anyEvent;
