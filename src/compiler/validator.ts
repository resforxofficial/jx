import type { Token } from './tokens.ts';

export function validate(tokens: Token[]): void {
    console.log("🧩 전체 토큰 목록:");
    tokens.forEach((t, idx) => {
        console.log(`${idx}: ${t.type} (${t.value})`);
    });

    let i = 0;
    const declaredVars = new Set<string>();
    const initializedVars = new Set<string>();

    const next = () => {
        const tok = tokens[i++];
        console.log(`🟡 next():`, tok);
        return tok;
    };

    const peek = () => {
        const tok = tokens[i];
        console.log(`🔵 peek():`, tok);
        return tok;
    };

    while (i < tokens.length) {
        const token = peek();

        // mut 키워드 처리
        if (token.type === 'Keyword' && token.value === 'mut') {
            next(); // mut
            const maybeType = peek();

            let type: Token | undefined = undefined;

            // 타입이 Type일 경우 처리
            if (maybeType.type === 'Type') {
                type = next(); // 타입
            }

            const identifier = next(); // 변수명
            declaredVars.add(identifier.value);

            const maybeEq = peek();
            if (maybeEq?.type === 'Operator' && maybeEq.value === '=') {
                next(); // =

                const maybeInput = peek();
                if (maybeInput?.type === 'Keyword' && maybeInput.value === 'input') {
                    next(); // input

                    const content = next();
                    if (content.type !== 'StringLiteral') {
                        throw new Error(`입력 문구는 문자열로 제공되어야 합니다 (${content.value})`);
                    }

                    const semi = next(); // 세미콜론 확인
                    if (semi.type !== 'Punctuation' || semi.value !== ';') {
                        throw new Error(`세미콜론(;)이 필요합니다 (${semi.value})`);
                    }

                    initializedVars.add(identifier.value); // ✅ input 시 초기화 처리
                    continue;
                }

                // 일반 리터럴 초기화
                const value = next();
                if (!['StringLiteral', 'NumberLiteral', 'BooleanLiteral'].includes(value.type)) {
                    throw new Error(`잘못된 초기화 값입니다 (${value.value})`);
                }

                initializedVars.add(identifier.value); // ✅ 리터럴도 초기화 처리
            }

            const semi = next();
            if (semi.type !== 'Punctuation' || semi.value !== ';') {
                throw new Error(`세미콜론(;)이 필요합니다 (${semi.value})`);
            }
        }

        // 기존 변수 = input "문장";
        else if (token.type === 'Identifier') {
            const identifier = next(); // 변수명

            if (!declaredVars.has(identifier.value)) {
                throw new Error(`변수 "${identifier.value}" 는 선언되지 않았습니다`);
            }

            const eq = next();
            if (eq.type !== 'Operator' || eq.value !== '=') {
                throw new Error(`'=' 연산자가 필요합니다 (${eq.value})`);
            }

            const inputKeyword = next();
            if (inputKeyword.type !== 'Keyword' || inputKeyword.value !== 'input') {
                throw new Error(`input 키워드가 필요합니다 (${inputKeyword.value})`);
            }

            const content = next();
            if (content.type !== 'StringLiteral') {
                throw new Error(`입력 문구는 문자열로 제공되어야 합니다 (${content.value})`);
            }

            const semi = next();
            if (semi.value !== ';') {
                throw new Error(`세미콜론(;)이 필요합니다 (${semi.value})`);
            }

            initializedVars.add(identifier.value); // ✅ 대입되었으므로 초기화 처리
        }

        // 출력문
        // 출력문
        else if (token.type === 'Keyword' && token.value === 'out') {
            next(); // out

            let expectingOperand = true;

            while (i < tokens.length) {
                const curr = peek();

                if (curr.type === 'Punctuation' && curr.value === ';') {
                    break; // 세미콜론 만나면 출력문 끝
                }

                if (expectingOperand) {
                    if (curr.type === 'Identifier') {
                        if (!declaredVars.has(curr.value)) {
                            throw new Error(`변수 "${curr.value}" 는 선언되지 않았습니다`);
                        }
                        if (!initializedVars.has(curr.value)) {
                            throw new Error(`변수 "${curr.value}" 는 초기화되지 않았습니다`);
                        }
                    }

                    if (!['Identifier', 'StringLiteral', 'NumberLiteral'].includes(curr.type)) {
                        throw new Error(`out 문에서 피연산자가 잘못되었습니다 (${curr.value})`);
                    }

                    next(); // 피연산자 통과
                    expectingOperand = false;
                } else {
                    if (curr.type !== 'Operator') {
                        throw new Error(`out 문에서 연산자가 필요합니다 (${curr.value})`);
                    }

                    next(); // 연산자 통과
                    expectingOperand = true;
                }
            }

            if (expectingOperand) {
                throw new Error('out 문 마지막에 피연산자가 필요합니다');
            }

            const semi = next(); // 세미콜론
            if (semi.type !== 'Punctuation' || semi.value !== ';') {
                throw new Error(`세미콜론(;)이 필요합니다 (${semi.value})`);
            }
        }

        else {
            throw new Error(`알 수 없는 문장: ${token.value}`);
        }
    }
}
