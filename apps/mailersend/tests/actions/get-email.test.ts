import action from "../../actions/get-email.ts";
import { testGetById } from "../_shapes.ts";

testGetById("get-email", action, "emailId", "/v1/email/{id}");
