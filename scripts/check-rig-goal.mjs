import fs from 'node:fs/promises';
const goal=JSON.parse(await fs.readFile('acceptance/goals/rig-apk.json'));
let complete=true;
for(const condition of goal.required){
 const passed=condition.status==='completed';complete&&=passed;
 console.log((passed?'PASS ':'BLOCKED ')+condition.id+': '+condition.condition);
}
if(goal.status!=='completed')complete=false;
console.log(complete?'RIG/APK GOAL COMPLETE':'RIG/APK GOAL BLOCKED — do not claim 100%');
process.exitCode=complete?0:1;
