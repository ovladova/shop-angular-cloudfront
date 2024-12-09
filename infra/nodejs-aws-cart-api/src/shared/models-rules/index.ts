import {AppRequest} from "../models/index";

export function getUserIdFromRequest(request: AppRequest): string {
  if (!request.user || !request.user.id) {
    throw new Error("User ID is missing in the request.");
  }

  return request.user.id;
}
