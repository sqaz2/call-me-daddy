import test from 'node:test';
import assert from 'node:assert/strict';
import childProcess from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

test('tracked media stays below the GitHub safety limit',()=>{
  const result=childProcess.spawnSync(process.execPath,['scripts/audit-media.mjs','--check','--json'],{cwd:root,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr||result.stdout);
  const report=JSON.parse(result.stdout);
  assert.ok(report.files>0);
  assert.deepEqual(report.aboveHardLimit,[]);
});

