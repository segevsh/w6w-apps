import action from "../../actions/get-message.ts";
import { testGetById } from "../_shapes.ts";

testGetById("get-message", action, "messageId", "/v1/messages/{id}");
