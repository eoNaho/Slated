import { Type as t } from "@sinclair/typebox";
import { ContentTargetType, TargetBody, TargetParams } from "./common";

export const LikeBody = TargetBody;

export const LikeParams = TargetParams;

export const LikedMediaQuery = t.Object({
  limit: t.Optional(t.String()),
  offset: t.Optional(t.String()),
});

export { ContentTargetType };
