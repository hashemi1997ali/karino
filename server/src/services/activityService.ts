import { Activity, type ActivityType } from "#models";

export const recordActivity = async ({
  userId,
  actorId = userId,
  type,
  entityId,
  label = "",
}: {
  userId: string;
  actorId?: string;
  type: ActivityType;
  entityId?: string | null;
  label?: string;
}): Promise<void> => {
  await Activity.create({
    user: userId,
    actor: actorId,
    type,
    entityId: entityId ?? null,
    label,
  });
};
