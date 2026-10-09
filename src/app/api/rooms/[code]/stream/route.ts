import { requireProfile } from "@/lib/server/auth";
import { liveRoomUpdate, roomSnapshot } from "@/lib/server/rooms";
import { failure } from "@/lib/server/http";
import { rateLimit } from "@/lib/server/db";
import { GameError } from "@/lib/poker/engine";

export const maxDuration = 300;

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const profile = await requireProfile();
    const { code } = await context.params;
    if (!(await rateLimit(`stream:${profile.id}`, 30, 60)))
      throw new GameError(
        "The connection is reconnecting too often. Please wait a moment.",
        429,
      );
    const initialRoom = await roomSnapshot(code, profile.id, true, true);
    const encoder = new TextEncoder();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const start = Date.now();
    let version = -1;
    // Each short database read observes shared durable state, so clients on
    // different Fluid instances converge. Reconnect before the function limit.
    const stream = new ReadableStream({
      start(controller) {
        const stop = () => {
          if (cancelled) return;
          cancelled = true;
          clearTimeout(timer);
          try {
            controller.close();
          } catch {
            /* Already cancelled by the browser. */
          }
        };
        request.signal.addEventListener("abort", stop, { once: true });
        const send = async () => {
          if (cancelled) return;
          try {
            const room = version === -1 ? initialRoom : await liveRoomUpdate(code, profile.id, version);
            if (cancelled) return;
            if (room && room.version !== version) {
              version = room.version;
              // Archives are fetched on demand instead of sending every previous
              // hand to every player on each turn and presence update.
              const live = {
                ...room,
                history: room.history.slice(-1),
                events: room.events.slice(-30),
              };
              controller.enqueue(
                encoder.encode(
                  `id: ${version}\nevent: state\ndata: ${JSON.stringify(live)}\n\n`,
                ),
              );
            } else
              controller.enqueue(
                encoder.encode(`event: heartbeat\ndata: ${Date.now()}\n\n`),
              );
            if (Date.now() - start > 260_000) {
              stop();
              return;
            }
            timer = setTimeout(send, 850);
          } catch (error) {
            console.error("river_stream_failed", {
              code,
              message: error instanceof Error ? error.name : "Unknown",
            });
            if (!cancelled)
              controller.enqueue(
                encoder.encode("event: unavailable\ndata: reconnect\n\n"),
              );
            stop();
          }
        };
        void send();
      },
      cancel() {
        cancelled = true;
        clearTimeout(timer);
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, no-transform",
        "X-Accel-Buffering": "no",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
