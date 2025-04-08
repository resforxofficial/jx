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
        // 출력문
        else if (token.type === 'Keyword' && token.value === 'out') {
            next(); // out

            let expectingOperand = true;

            while (true) {
                const current = peek();

                // 세미콜론 만나면 out 구문 종료
                if (current.type === 'Punctuation' && current.value === ';') {
                    next(); // consume ;
                    break;
                }

                if (expectingOperand) {
                    if (!['Identifier', 'StringLiteral', 'NumberLiteral', 'BooleanLiteral'].includes(current.type)) {
                        throw new Error(`out 구문에서 피연산자가 유효하지 않습니다: ${current.value}`);
                    }
                    next(); // consume operand
                    expectingOperand = false;
                } else {
                    if (current.type !== 'Operator' || !['+', '-', '*', '/'].includes(current.value)) {
                        throw new Error(`out 구문에서 연산자가 필요합니다: ${current.value}`);
                    }
                    next(); // consume operator
                    expectingOperand = true;
                }
            }
        }

        // 조건문 (if)
        else if (token.type === 'Keyword' && token.value === 'if') {
            next(); // 'if'

            expect('ParenOpen'); // (

            const left = next();
            const operator = next();
            const right = next();

            if (!['Identifier', 'NumberLiteral', 'BooleanLiteral', 'StringLiteral'].includes(left.type)) {
                throw new Error(`조건식의 왼쪽이 잘못됨: ${left.value}`);
            }

            if (operator.type !== 'Operator' || !['==', '!=', '<', '>', '<=', '>='].includes(operator.value)) {
                throw new Error(`조건문에 잘못된 연산자: ${operator.value}`);
            }

            if (!['Identifier', 'NumberLiteral', 'BooleanLiteral', 'StringLiteral'].includes(right.type)) {
                throw new Error(`조건식의 오른쪽이 잘못됨: ${right.value}`);
            }

            expect('ParenClose'); // )
            expect('BraceOpen'); // {

            // 중괄호 내부 파싱 - 간단하게 ; 올 때까지 계속 넘겨주는 방식
            while (peek()?.type !== 'BraceClose') {
                next(); // 이건 추후 제대로 parseBlock 같은 걸로 구조화 가능
            }

            expect('BraceClose'); // }

            // else 처리 (선택)
            if (peek()?.type === 'Keyword' && peek()?.value === 'else') {
                next(); // 'else'
                expect('BraceOpen');

                while (peek()?.type !== 'BraceClose') {
                    next();
                }

                expect('BraceClose');
            }
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
