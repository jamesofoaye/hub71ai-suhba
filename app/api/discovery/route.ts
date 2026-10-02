import { db,responseError } from '@/lib/server';
import { seedCatalogue } from '@/lib/seed';
export async function GET(){try{await seedCatalogue();const sources=await db().prepare("SELECT id,version,data FROM entities WHERE kind='source' AND deleted=0").all<any>();return Response.json(sources.results.map(r=>({id:r.id,version:r.version,data:JSON.parse(r.data)})),{headers:{'Cache-Control':'no-store'}});}catch(e){return responseError(e);}}
