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
            const type = next(); // str
            const identifier = next(); // a
            next(); // =
            const value = next(); // "hello"
            next(); // ;

            output.push(`let ${identifier.value} = ${value.value};`);
        } else if (token.type === 'Keyword' && token.value === 'out') {
            next(); // out
            const identifier = next(); // a
            next(); // ;

            output.push(`print(${identifier.value});`);
        } else {
            throw new Error(`transform 에러: 지원하지 않는 문장입니다 (${token.value})`);
        }
    }

    return output.join('\n');
}
