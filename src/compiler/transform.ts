// transform.ts
import type { Token } from './tokens.ts';

export function transform(tokens: Token[]): string {
    let i = 0;
    const output: string[] = [];

    const next = () => tokens[i++];
    const peek = () => tokens[i];

    while (i < tokens.length) {
        const token = peek();

        if (token.type === 'Keyword' && token.value === 'mut') {
            next(); // mut
            const type = next(); // str, num, bool
            const identifier = next(); // 변수명
            const maybeEq = peek();

            if (maybeEq?.type === 'Operator' && maybeEq.value === '=') {
                next(); // =
                const value = next();
                next(); // ;
                output.push(`let ${identifier.value} = ${JSON.stringify(value.value)};`);
            } else {
                next(); // ;
                output.push(`let ${identifier.value};`);
            }
        }

        else if (token.type === 'Keyword' && token.value === 'out') {
            next(); // out
            const valueToken = next();
            next(); // ;
            if (valueToken.type === 'Identifier') {
                output.push(`console.log(${valueToken.value});`);
            } else {
                output.push(`console.log(${JSON.stringify(valueToken.value)});`);
            }
        }

        else {
            throw new Error(`transform 에러: 지원하지 않는 문장입니다 (${token.value})`);
        }
    }

    return output.join('\n');
}
