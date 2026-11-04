import { createClient } from './supabase.js';
export const client = createClient('https://bzegomrjkrklrdruosxc.supabase.co', 'sb_publishable_GBNaCaBWeS4BzyFdTsyIPA_PUWYQrC_');
export async function loadPortfolio(userId) {
  const {data,error} = await client.from('portfolios').select('data,revision').eq('user_id',userId).maybeSingle();
  if(error) throw error;
  return data;
}
export async function writePortfolio(userId, revision, portfolio) {
  const table=client.from('portfolios');
  const query=revision === null ? table.insert({user_id:userId,data:portfolio}) : table.update({data:portfolio}).eq('user_id',userId).eq('revision',revision);
  const {data,error}=await query.select('revision').maybeSingle();
  if(error?.code==='23505' || (!error && !data)) throw Error('Newer cloud records exist. Close this form, refresh cloud records, and try again.');
  if(error) throw Error('Cloud save failed. Your changes were not confirmed. Refresh before retrying. '+error.message);
  return data.revision;
}
