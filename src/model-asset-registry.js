import {compressedFidelityAssetsApproved} from './fidelity-policy.js';
import {manualHeroAssetUrls as originalUrls,manualHeroAssetHashes as originalHashes} from './manual-hero-assets.js';
import {fidelityModelUrls,fidelityModelHashes} from './fidelity-model-assets.js';
export const manualHeroAssetUrls=Object.fromEntries(Object.entries(originalUrls).filter(([key])=>!key.endsWith('-gpu')));
if(compressedFidelityAssetsApproved)Object.assign(manualHeroAssetUrls,fidelityModelUrls);
export const manualHeroAssetHashes=Object.fromEntries(Object.entries(originalHashes).filter(([key])=>!key.endsWith('-gpu')));
if(compressedFidelityAssetsApproved)Object.assign(manualHeroAssetHashes,fidelityModelHashes);
