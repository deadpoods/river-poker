import { requireProfile } from "@/lib/server/auth";
import { database } from "@/lib/server/db";
import { body, checkOrigin, failure, json, textInput } from "@/lib/server/http";
import { GameError } from "@/lib/poker/engine";
import type { Profile, Room } from "@/lib/types";

export async function PATCH(request: Request) {
  try {
    checkOrigin(request);
    const authenticated = await requireProfile();
    const data = await body(request);
    const sql = database();
    const profile = await sql.begin(async (tx) => {
      // Read after locking so concurrent changes to different preferences merge.
      const rows =
        await tx`SELECT data FROM river_profiles WHERE id = ${authenticated.id} FOR UPDATE`;
      const profile = rows[0].data as Profile;
      const previousName = profile.name;
      const previousColor = profile.color;
      if (data.name !== undefined)
        profile.name = textInput(data.name, "Name", 24);
      if (data.color !== undefined) {
        if (
          !["blue", "sage", "rose", "sand", "lilac", "orange"].includes(
            String(data.color),
          )
        )
          throw new GameError("Choose a valid profile color.");
        profile.color = String(data.color);
      }
      if (data.preferences !== undefined) {
        if (
          !data.preferences ||
          typeof data.preferences !== "object" ||
          Array.isArray(data.preferences)
        )
          throw new GameError("Invalid preferences.");
        for (const key of ["assistant", "sound", "reducedMotion"] as const) {
          const value = (data.preferences as Record<string, unknown>)[key];
          if (value !== undefined) {
            if (typeof value !== "boolean")
              throw new GameError("Invalid preference.");
            profile.preferences[key] = value;
          }
        }
      }
      await tx`UPDATE river_profiles SET data = ${tx.json(profile)} WHERE id = ${profile.id}`;
      if (profile.name !== previousName || profile.color !== previousColor) {
        // Stable lock order keeps simultaneous identity edits from deadlocking.
        // Past hand records retain the names used when those hands were played.
        const rooms =
          await tx`SELECT r.id, r.data FROM river_rooms r JOIN river_members m ON m.room_id = r.id
          WHERE m.profile_id = ${profile.id} AND r.data->>'status' IN ('lobby', 'playing')
          ORDER BY r.id FOR UPDATE OF r`;
        for (const row of rooms) {
          const room = row.data as Room;
          const player = room.players.find((p) => p.id === profile.id);
          if (!player || Date.now() - room.updatedAt > 48 * 60 * 60 * 1000)
            continue;
          player.name = profile.name;
          player.color = profile.color;
          room.version++;
          room.updatedAt = Date.now();
          await tx`UPDATE river_rooms SET data = ${tx.json(room)}, updated_at = now() WHERE id = ${row.id}`;
        }
      }
      return profile;
    });
    return json({ profile });
  } catch (e) {
    return failure(e);
  }
}
