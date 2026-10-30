let scope = 'legacy';
export const setStorageScope = (value: string) => { scope = value; };
export const storageScope = () => scope;
export function adoptLegacyDataForAdmin(userId: string) {
  try {
    const oldDrafts=localStorage.getItem('gagaclo_fpp_drafts_v1:legacy');
    const scopedDrafts=`gagaclo_fpp_drafts_v1:${userId}`;
    if(oldDrafts && !localStorage.getItem(scopedDrafts))localStorage.setItem(scopedDrafts,oldDrafts);
    const oldCache=localStorage.getItem('gagaclo_purchase_requisitions_v2');
    const scopedCache=`gagaclo_purchase_requisitions_v2:${userId}`;
    if(oldCache && !localStorage.getItem(scopedCache))localStorage.setItem(scopedCache,oldCache);
  } catch { /* Keep the original browser data intact if storage is full. */ }
}
