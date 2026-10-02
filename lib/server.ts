import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import type { Entity } from './model';
export const db=()=>{if(!env.DB)throw new Error('Database unavailable');return env.DB as D1Database;};
export const bucket=()=>{if(!env.BUCKET)throw new Error('Evidence storage unavailable');return env.BUCKET as R2Bucket;};
export async function identity(){const u=await getChatGPTUser();if(!u)throw new HttpError(401,'Sign in to continue');return u;}
export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
export function protect(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw new HttpError(403,'Request origin not allowed');if(!req.headers.get('content-type')?.includes('application/json'))throw new HttpError(415,'Expected JSON');}
export function responseError(e:unknown){console.error(e instanceof Error?e.message:'Request failed');const storage=e instanceof Error&&/D1|Database|R2|storage|SQLITE/i.test(e.message);const status=e instanceof HttpError?e.status:storage?503:400;return Response.json({error:storage?'Storage is temporarily unavailable. Your input has been kept; try again.':e instanceof Error?e.message:'Request failed'},{status});}
export async function entity(id:string,user:string,write=false){const row=await db().prepare('SELECT * FROM entities WHERE id=?').bind(id).first<any>();if(!row)throw new HttpError(404,'Workspace not found');const member=await db().prepare('SELECT role FROM members WHERE entity=? AND user=?').bind(id,user).first<{role:string}>();const role=row.owner===user?'owner':member?.role;if(!role||(write&&role==='viewer'))throw new HttpError(403,'You do not have access');return {...row,data:JSON.parse(row.data),role} as Entity;}
export function visible(row:any,user:string){const data=typeof row.data==='string'?JSON.parse(row.data):{...row.data};if(row.owner!==user){delete data.privateNotes;}return {...row,data,role:row.owner===user?'owner':row.role};}
export function isAdmin(user:string,email?:string){const e=env as unknown as {ADMIN_USER_IDS?:string;ADMIN_EMAILS?:string};return (e.ADMIN_USER_IDS??'').split(',').includes(user)||!!email&&(e.ADMIN_EMAILS??'').toLowerCase().split(',').includes(email.toLowerCase());}
export async function hash(token:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
