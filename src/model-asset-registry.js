import {manualHeroAssetUrls as originals,manualHeroAssetHashes as originalHashes} from './manual-hero-assets.js';
import {optimizedModelAssets} from './optimized-model-assets.js';
export const manualHeroAssetUrls={...originals};
export const manualHeroAssetHashes={...originalHashes};
for(const [key,asset] of Object.entries(optimizedModelAssets)){
 manualHeroAssetUrls[key+'-gpu']=asset.url;
 manualHeroAssetHashes[key+'-gpu']=asset.sha256;
}
