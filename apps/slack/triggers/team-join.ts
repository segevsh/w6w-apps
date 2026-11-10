import { slackTrigger } from "../lib/triggers.ts";
import { namedSpec } from "../lib/events.ts";

export default slackTrigger(namedSpec("team-join"));
