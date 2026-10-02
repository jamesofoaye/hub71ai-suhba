import { env } from 'cloudflare:workers';
import { db, identity, protect, responseError, entity, HttpError } from '@/lib/server';
import { AIError, AI_RESERVE_SQL, readAIRequest, requestAI, type AISource } from '@/lib/ai';

export async function POST(req: Request) {
  try {
    protect(req);
    const user = await identity();
    const input = await readAIRequest(req);

    // Access is checked without putting any workspace fields into the prompt.
    if (input.workspaceId) {
      const workspace = await entity(input.workspaceId, user.userId);
      if (workspace.deleted) throw new HttpError(409, 'Restore this workspace before requesting AI help.');
      if (!['goal', 'request', 'proof', 'collection'].includes(workspace.kind)) {
        throw new HttpError(400, 'Select a goal, ask, proof page or collection.');
      }
    }
    const apiKey = (env as unknown as { OPENAI_API_KEY?: string }).OPENAI_API_KEY;
    if (!apiKey?.trim()) {
      throw new HttpError(503, 'Live AI is not connected. Your selected text is kept; editable templates remain available.');
    }

    const sources: AISource[] = [];
    for (const id of input.sourceIds) {
      const row = await db().prepare("SELECT id,data FROM entities WHERE id=? AND kind='source' AND deleted=0").bind(id).first<{ id: string; data: string }>();
      if (!row) throw new HttpError(409, 'A selected source is missing. Refresh your source selection before continuing.');
      const data = JSON.parse(row.data);
      if (data.status !== 'available') throw new HttpError(409, 'A selected source needs review or is unavailable. Refresh your source selection.');
      sources.push({ id: row.id, data });
    }

    // One atomic statement makes simultaneous requests share the same durable limits.
    // Failures count conservatively; only identifiers and times are stored.
    const now = Date.now();
    const day = new Date(now).toISOString().slice(0, 10);
    const attempt = await db().prepare(AI_RESERVE_SQL).bind(
      crypto.randomUUID(), user.userId, now, day, user.userId, day, user.userId, now - 20000
    ).run();
    if (!attempt.meta.changes) {
      throw new HttpError(429, 'AI request limit reached. Wait 20 seconds between requests; this preview allows 10 requests per person each UTC day and 100 in total. Your text is kept.');
    }

    const result = await requestAI(input, sources, apiKey);
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return responseError(error instanceof AIError ? new HttpError(error.status, error.message) : error);
  }
}
