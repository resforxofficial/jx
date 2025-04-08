import type { Token } from './tokens.ts';

export function parse(tokens: Token[]): void {
    let i = 0;

    const next = () => tokens[i++];
    const peek = () => tokens[i];
    const expect = (type: string, value?: string) => {
        const token = next();
        if (!token || token.type !== type || (value && token.value !== value)) {
            throw new Error(`파싱 에러: ${type}${value ? ` "${value}"` : ''} 가 필요하지만, ${token?.value ?? 'EOF'} 를 받음`);
        }
        return token;
    };

    while (i < tokens.length) {
        const token = peek();

        // 변수 선언 (mut)
        if (token.type === 'Keyword' && token.value === 'mut') {
            next(); // mut
            const maybeTypeOrIdent = next();

            let identifier;

            if (maybeTypeOrIdent.type === 'Type') {
                identifier = expect('Identifier');
            } else if (maybeTypeOrIdent.type === 'Identifier') {
                identifier = maybeTypeOrIdent;
            } else {
                throw new Error(`mut 다음에는 타입 또는 식별자가 와야 합니다.`);
            }

            if (/^[0-9]/.test(identifier.value)) {
                throw new Error(`변수명은 숫자로 시작할 수 없습니다: ${identifier.value}`);
            }

            const maybeEq = peek();
            if (maybeEq?.type === 'Operator' && maybeEq.value === '=') {
                next(); // =

                const maybeInput = peek();
                if (maybeInput.type === 'Keyword' && maybeInput.value === 'input') {
                    next(); // input
                    expect('StringLiteral');
                    expect('Punctuation', ';'); // 여기서 세미콜론 기대
                    continue;
                } else {
                    const valueToken = next();
                    if (!['StringLiteral', 'NumberLiteral', 'BooleanLiteral'].includes(valueToken.type)) {
                        throw new Error(`잘못된 값: ${valueToken.value}`);
                    }
                    expect('Punctuation', ';'); // 일반 초기화일 경우
                    continue;
                }
            }

            expect('Punctuation', ';'); // 초기화 없이 선언만 한 경우
        }

        // 출력문
        else if (token.type === 'Keyword' && token.value === 'out') {
            next(); // out

            const left = next();
            if (!['Identifier', 'StringLiteral', 'NumberLiteral', 'BooleanLiteral'].includes(left.type)) {
                throw new Error(`out 구문의 왼쪽 값이 유효하지 않습니다: ${left.value}`);
            }

            const maybeOperator = peek();
            if (maybeOperator?.type === 'Operator') {
                next(); // 연산자
                const right = next();
                if (!['Identifier', 'StringLiteral', 'NumberLiteral'].includes(right.type)) {
                    throw new Error(`out 연산식 오류: 오른쪽 항이 유효하지 않음`);
                }
            }

            expect('Punctuation', ';'); // 마지막 세미콜론
        }

        // 단순 input: a = input "문장";
        else if (token.type === 'Identifier') {
            next(); // 변수명
            expect('Operator', '=');
            expect('Keyword', 'input');
            expect('StringLiteral');
            expect('Punctuation', ';');
        }

        else {
            throw new Error(`지원되지 않는 문법 시작: ${token.value}`);
        }
    }
}
