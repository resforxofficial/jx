import fs from 'fs';
import path from 'path';
import { transform } from './compiler/transform.js';
import { spawnSync } from 'child_process';

const inputPath = process.argv[2];

if (!inputPath) {
    console.error('파일 경로를 입력해주세요: tx hello.tx');
    process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf-8');

const jsCode = `import { print } from "./src/runtime/index.ts";

${transform(raw)}`;

const outputPath = path.resolve('./tx_temp_output.ts');
fs.writeFileSync(outputPath, jsCode);

spawnSync('npx', ['tsx', outputPath], { stdio: 'inherit' });
