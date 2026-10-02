import { identity,protect,responseError,HttpError } from '@/lib/server';
export async function POST(req:Request){try{protect(req);await identity();throw new HttpError(503,'Hosted AI is not connected. Use the editable inquiry template; no output is presented as live AI.');}catch(e){return responseError(e);}}
