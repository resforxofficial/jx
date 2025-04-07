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
            const typeToken = next(); // str, num, bool
            const identifier = next(); // a
            next(); // =
            const valueToken = next(); // "hello", 123, true
            next(); // ;

            // 타입 검사
            if (typeToken.value === 'str' && valueToken.type !== 'StringLiteral') {
                throw new Error(`타입 오류: str 타입 변수에는 문자열만 할당할 수 있습니다 (현재: ${valueToken.type})`);
            }

            if (typeToken.value === 'num' && valueToken.type !== 'NumberLiteral') {
                throw new Error(`타입 오류: num 타입 변수에는 숫자만 할당할 수 있습니다 (현재: ${valueToken.type})`);
            }

            if (typeToken.value === 'bool' && valueToken.type !== 'BooleanLiteral') {
                throw new Error(`타입 오류: bool 타입 변수에는 true/false만 할당할 수 있습니다 (현재: ${valueToken.type})`);
            }

            // 자바스크립트 코드로 변환
            let jsValue = valueToken.value;
            if (valueToken.type === 'StringLiteral') {
                jsValue = `"${jsValue}"`; // 문자열은 따옴표로 감싸기
            }

            output.push(`let ${identifier.value} = ${jsValue};`);
        } else if (token.type === 'Keyword' && token.value === 'out') {
            next(); // out
            const identifier = next(); // a
            next(); // ;

            output.push(`console.log(${identifier.value});`);
        } else {
            throw new Error(`transform 에러: 지원하지 않는 문장입니다 (${token.value})`);
        }
    }

    return output.join('\n');
}
