import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildCoachContext, buildCoachMessages } from "@/lib/coach";
import { OllamaError, releaseOllama, streamChatCompletion, tryAcquireOllama } from "@/lib/ollama";
import { coachOptions } from "@/lib/coach/config";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const HISTORY_TURNS = 10;
const DEFAULT_QUESTION =
  "Review my last 7 days of training, nutrition and body weight. What are my top priorities for next week?";

/** Conversation history (the most recent 200 messages, oldest first). */
export async function GET() {
  const latest = await prisma.coachMessage.findMany({ orderBy: { id: "desc" }, take: 200 });
  return NextResponse.json({ messages: latest.reverse() });
}

export async function DELETE() {
  await prisma.coachMessage.deleteMany();
  return NextResponse.json({ ok: true });
}

const Body = z.object({ message: z.string().max(4000).optional() });

/** Ask the coach. Responds with a text/plain stream of the reply. */
export async function POST(req: Request) {
  // Requiring JSON forces browsers to send a CORS preflight for cross-site
  // requests, so other websites can't silently trigger generations.
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return NextResponse.json({ error: "Expected application/json." }, { status: 415 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  // One Ollama job at a time (shared with checkups and self-tests).
  if (!tryAcquireOllama("coach")) {
    return NextResponse.json(
      { error: "The coach is busy with another request. Try again in a moment." },
      { status: 429 },
    );
  }
  let handedOff = false; // once true, the stream is responsible for releasing the lock

  try {
    const question = parsed.data.message?.trim() || DEFAULT_QUESTION;
    const [settings, context, recent] = await Promise.all([
      getSettings(),
      buildCoachContext(),
      prisma.coachMessage.findMany({ orderBy: { id: "desc" }, take: HISTORY_TURNS }),
    ]);
    const messages = buildCoachMessages(context, recent.reverse(), question);

    // Aborts generation when the client disconnects or cancels the stream.
    // req.signal is forwarded through our own controller rather than passed to
    // fetch directly: its abort reason is Node's ECONNRESET error, which undici
    // would re-throw as an uncaught exception.
    const upstream = new AbortController();
    const onClientGone = () => upstream.abort();
    if (req.signal.aborted) onClientGone();
    else req.signal.addEventListener("abort", onClientGone, { once: true });
    const tokens = streamChatCompletion(messages, {
      ...coachOptions(settings),
      signal: upstream.signal,
    });

    // Pull the first token before answering, so connection or model errors
    // become a proper JSON error response instead of a broken stream.
    let first: IteratorResult<string>;
    try {
      first = await tokens.next();
    } catch (err) {
      if (err instanceof OllamaError) return NextResponse.json(err.toJSON(), { status: err.httpStatus });
      console.error("coach failed", err);
      return NextResponse.json({ error: "Coach request failed." }, { status: 500 });
    }

    await prisma.coachMessage.create({ data: { role: "user", content: question } });

    const encoder = new TextEncoder();
    let open = true;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        // After a client disconnect the controller is closed; writing to it would throw.
        const send = (text: string) => {
          if (!open) return;
          try {
            controller.enqueue(encoder.encode(text));
          } catch {
            open = false;
          }
        };
        let reply = first.done ? "" : first.value;
        send(reply);
        try {
          for await (const token of tokens) {
            reply += token;
            send(token);
          }
        } catch (err) {
          if (!(err instanceof OllamaError && err.code === "ABORTED")) {
            const note = `\n\n[Coach connection lost: ${err instanceof Error ? err.message : "stream interrupted"}]`;
            reply += note;
            send(note);
          }
        } finally {
          releaseOllama("coach");
          if (reply.trim()) {
            await prisma.coachMessage
              .create({ data: { role: "assistant", content: reply } })
              .catch((e) => console.error("failed to save coach reply", e));
          }
          if (open) {
            open = false;
            try {
              controller.close();
            } catch {
              /* already closed */
            }
          }
        }
      },
      cancel() {
        open = false;
        upstream.abort();
      },
    });
    handedOff = true;

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Accel-Buffering": "no",
      },
    });
  } finally {
    if (!handedOff) releaseOllama("coach");
  }
}
