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

        if (token.type === 'Keyword' && token.value === 'mut') {
            next(); // mut
            expect('Type'); // str, int, bool
            const ident = expect('Identifier');

            if (/^[0-9]/.test(ident.value)) {
                throw new Error(`변수명은 숫자로 시작할 수 없습니다: ${ident.value}`);
            }

            const maybeEq = peek();
            if (maybeEq?.type === 'Operator' && maybeEq.value === '=') {
                next(); // =
                const valueToken = next();
                if (!['StringLiteral', 'NumberLiteral', 'BooleanLiteral'].includes(valueToken.type)) {
                    throw new Error(`잘못된 값: ${valueToken.value}`);
                }
            }

            expect('Punctuation', ';');
        }

        else if (token.type === 'Keyword' && token.value === 'out') {
            next(); // out
            const valueToken = next();
            if (!['Identifier', 'StringLiteral', 'NumberLiteral', 'BooleanLiteral'].includes(valueToken.type)) {
                throw new Error(`out 다음에는 변수명이나 리터럴이 와야 합니다: ${valueToken.value}`);
            }
            expect('Punctuation', ';');
        }

        // ✅ input 문법 처리: a = input "msg";
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
