import type { Token } from './tokens.ts';

export function validate(tokens: Token[]): void {
    let i = 0;
    const declaredVars = new Set<string>();

    const next = () => tokens[i++];
    const peek = () => tokens[i];

    while (i < tokens.length) {
        const token = peek();

        // mut 키워드 처리
        if (token.type === 'Keyword' && token.value === 'mut') {
            next(); // mut
            const maybeType = peek();

            let type: Token | undefined = undefined;

            if (maybeType.type === 'Identifier' && ['int', 'str', 'bool'].includes(maybeType.value)) {
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

                    const semi = next();
                    if (semi.type !== 'Punctuation' || semi.value !== ';') {
                        throw new Error(`세미콜론(;)이 필요합니다 (${semi.value})`);
                    }

                    continue; // 여기서 세미콜론까지 끝냈으니까 아래로 내려가지 않게
                }

                else {
                    const value = next();
                    if (!['StringLiteral', 'NumberLiteral', 'BooleanLiteral'].includes(value.type)) {
                        throw new Error(`잘못된 초기화 값입니다 (${value.value})`);
                    }
                }
            }

            const semi = next();
            if (semi.type !== 'Punctuation' || semi.value !== ';') {
                console.log('🚨 세미콜론 에러 직전 상태:', { semi, 현재토큰: token, i });
                throw new Error(`세미콜론(;)이 필요합니다 (${semi.value})`);
            }
        }

        // 기존 변수 = input "문구";
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
        }

        // 출력문
        else if (token.type === 'Keyword' && token.value === 'out') {
            next(); // out
            const left = next();

            if (left.type === 'Identifier' && !declaredVars.has(left.value)) {
                throw new Error(`변수 "${left.value}" 는 선언되지 않았습니다`);
            }

            const maybeOp = peek();
            if (maybeOp?.type === 'Operator') {
                next(); // 연산자
                const right = next();
                if (right.type === 'Identifier' && !declaredVars.has(right.value)) {
                    throw new Error(`변수 "${right.value}" 는 선언되지 않았습니다`);
                }
                if (!['Identifier', 'StringLiteral', 'NumberLiteral'].includes(right.type)) {
                    throw new Error(`out 문: 우항이 잘못됨 (${right.value})`);
                }
            }

            const semi = next();
            if (semi.type !== 'Punctuation' || semi.value !== ';') {
                throw new Error(`세미콜론(;)이 필요합니다 (${semi.value})`);
            }
        }

        else {
            throw new Error(`알 수 없는 문장: ${token.value}`);
        }
    }
}
