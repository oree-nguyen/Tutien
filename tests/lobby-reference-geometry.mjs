// Independent measurements in the supplied 1376×768 references.
// Content such as balances and live 3D animation is audited separately.
export const referenceGeometry={
 home:{'.player-banner':[20,16,340,102],'.lobby-benefits':[376,26,282,92],'.lobby-events':[22,190,202,null],'.lobby-bottom-nav':[20,685,697,64],'#start':[1008,664,350,85]},
 character:{'.character-panel':[932,0,444,768]},
 heroes:{'.hero-roster':[24,93,371,653],'.character-panel':[998,93,354,585],'.hero-confirm':[1027,690,310,56]},
};
export async function auditGeometry(page,view,viewport){
 const scale=viewport.width/viewport.height<1.6?viewport.width/1376:viewport.height/768,checks=[];
 // The wide viewport anchors right-side panels to the right edge.
 for(const [selector,expected] of Object.entries(referenceGeometry[view]??{})){
  const actual=await page.locator(selector).boundingBox();
  if(!actual)throw Error(`${view}: missing ${selector}`);
  const rightAnchored=selector==='#start'||selector==='.hero-confirm'||selector==='.character-panel';
  const target=expected.map((v,i)=>v===null?null:v*scale);
  if(rightAnchored)target[0]=viewport.width-(1376-expected[0])*scale;
  const delta=['x','y','width','height'].map((k,i)=>target[i]===null?0:Math.abs(actual[k]-target[i]));
  checks.push({selector,actual,target,maxErrorPx:Math.max(...delta)});
 }
 return checks;
}
