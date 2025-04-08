import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

import { tokenize } from './compiler/tokens.js';
import { validate } from './compiler/validator.js';
import { parse } from './compiler/parser.js';
import { transform } from './compiler/transform.js';

const inputPath = process.argv[2];

if (!inputPath) {
    console.error('파일 경로를 입력해주세요: tx hello.tx');
    process.exit(1);
}

const raw = fs.readFileSync(inputPath, 'utf-8');

// 1. 토크나이징
const tokens = tokenize(raw);

// 2. 문법 검사
validate(tokens);

// 3. 파싱 → AST 생성
const ast = parse(tokens);

// 4. JS 코드로 변환
const jsCode = transform(ast);

// 5. 변환 결과 저장
const outputPath = path.resolve('./.tx_temp_output.ts');
fs.writeFileSync(outputPath, jsCode);

// 6. 실행
spawnSync('npx', ['tsx', outputPath], { stdio: 'inherit' });
