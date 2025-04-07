// parser.ts
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
            // 변수 선언 파싱
            next(); // 'mut'
            expect('Type'); // 'str'
            const ident = expect('Identifier'); // 변수명

            if (/^[0-9]/.test(ident.value)) {
                throw new Error(`변수명은 숫자로 시작할 수 없습니다: ${ident.value}`);
            }

            expect('Operator', '='); // '='
            const valueToken = next();

            if (!['StringLiteral', 'NumberLiteral', 'BooleanLiteral'].includes(valueToken.type)) {
                throw new Error(`잘못된 값: ${valueToken.value}`);
            }

            expect('Punctuation', ';'); // ';'
        } else if (token.type === 'Keyword' && token.value === 'out') {
            next(); // 'out'
            expect('Identifier'); // 출력할 변수명
            expect('Punctuation', ';');
        } else {
            throw new Error(`지원되지 않는 문법 시작: ${token.value}`);
        }
    }
}
