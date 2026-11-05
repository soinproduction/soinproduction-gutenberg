import fs from 'node:fs';
const {version}=JSON.parse(fs.readFileSync('package.json','utf8'));
if(process.env.GITHUB_REF_TYPE==='tag'&&process.env.GITHUB_REF_NAME!==`v${version}`)throw new Error(`Release tag must equal v${version}`);
if(process.env.GITHUB_EVENT_NAME==='workflow_dispatch'&&process.env.GITHUB_REF_NAME!=='main')throw new Error('Manual publication must use main');
console.log(`Release version: ${version}`);
