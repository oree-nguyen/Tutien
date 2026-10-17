// Only this game's offline fields are edited. Profile values come from existing gameplay.
export const OFFLINE_SAVE_KEY='hon-gioi-save-v2';
export const PROFILE_MIRROR_KEY='hon-gioi-v25';
export function readOfflineSave(storage){const raw=storage.getItem(OFFLINE_SAVE_KEY);if(raw===null)return{};const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Bản lưu ngoại tuyến không hợp lệ');return value;}
export function persistOfflineSave(storage,profile,{snapshot=null,receipt=null}={}){
 const previous=readOfflineSave(storage),next={...previous,version:4,profile,match:snapshot,activeRun:receipt};
 storage.setItem(OFFLINE_SAVE_KEY,JSON.stringify(next));
 // The primary record is the commit boundary. A redundant mirror must not undo it.
 let mirrorError=null;try{storage.setItem(PROFILE_MIRROR_KEY,JSON.stringify(profile));}catch(error){mirrorError=error.message;}
 return{mirrorError};
}
export function clearOfflineSave(storage,profile){return persistOfflineSave(storage,profile,{snapshot:null,receipt:null});}
