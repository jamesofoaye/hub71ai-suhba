import { db } from './server';
import { catalogue } from './catalogue';
let seeded=false;
export async function seedCatalogue(){if(seeded)return;const now=new Date().toISOString();await db().batch(catalogue.map(s=>db().prepare('INSERT OR IGNORE INTO entities(id,owner,kind,data,created,updated) VALUES(?,?,?,?,?,?)').bind(s.id,s.owner,s.kind,JSON.stringify(s.data),now,now)));seeded=true;}
