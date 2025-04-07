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
            const type = next(); // str, int, bool
            const identifier = next(); // 변수명
            const maybeEq = peek();

            const tsType = mapTypeToTs(type.value);

            if (maybeEq?.type === 'Operator' && maybeEq.value === '=') {
                next(); // =
                const value = next(); // "hello", 123, true 등
                next(); // ;

                const formattedValue = formatValueByType(value, type.value);
                output.push(`let ${identifier.value}: ${tsType} = ${formattedValue};`);
            } else {
                next(); // ;
                output.push(`let ${identifier.value}: ${tsType};`);
            }
        }

        else if (token.type === 'Keyword' && token.value === 'out') {
            next(); // out
            const valueToken = next();
            next(); // ;

            if (valueToken.type === 'Identifier') {
                output.push(`console.log(${valueToken.value});`);
            } else {
                const outValue = formatValueByType(valueToken, detectLiteralType(valueToken));
                output.push(`console.log(${outValue});`);
            }
        }

        else {
            throw new Error(`transform 에러: 지원하지 않는 문장입니다 (${token.value})`);
        }
    }

    return output.join('\n');
}

function mapTypeToTs(type: string): string {
    if (type === 'str') return 'string';
    if (type === 'int') return 'number';
    if (type === 'bool') return 'boolean';
    return 'any';
}

function formatValueByType(token: Token, type: string): string {
    if (type === 'str') return JSON.stringify(token.value);
    return token.value;
}

function detectLiteralType(token: Token): string {
    if (token.type === 'StringLiteral') return 'str';
    if (token.type === 'NumberLiteral') return 'int';
    if (token.type === 'BooleanLiteral') return 'bool';
    return 'any';
}
