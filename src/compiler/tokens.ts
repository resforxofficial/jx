export type TokenType =
    | 'Keyword'          // mut, out 등
    | 'Type'             // str, num, bool 등
    | 'Identifier'       // 변수명
    | 'Operator'         // =, +, -, *, /
    | 'StringLiteral'    // "hello"
    | 'NumberLiteral'    // 123
    | 'BooleanLiteral'   // true, false
    | 'Semicolon'        // ;
    | 'ParenOpen'        // (
    | 'ParenClose'       // )
    | 'Unknown';         // 모르는 것들 (에러 처리용)

export interface Token {
    type: TokenType;
    value: string;
    position: number; // 에러 메시지 줄 때 유용함
}

export function tokenize(code: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;

    while (i < code.length) {
        const char = code[i];

        // 공백 무시
        if (/\s/.test(char)) {
            i++;
            continue;
        }

        // 세미콜론
        if (char === ';') {
            tokens.push({ type: 'Semicolon', value: ';', position: i });
            i++;
            continue;
        }

        // 문자열
        if (char === '"') {
            let value = '';
            i++; // skip first quote
            while (i < code.length && code[i] !== '"') {
                value += code[i++];
            }
            i++; // skip closing quote
            tokens.push({ type: 'StringLiteral', value, position: i });
            continue;
        }

        // 단어 추출
        const wordMatch = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(code.slice(i));
        if (wordMatch) {
            const word = wordMatch[0];

            // 키워드인지 확인
            if (word === 'mut' || word === 'out') {
                tokens.push({ type: 'Keyword', value: word, position: i });
            } else if (['str', 'num', 'bool'].includes(word)) {
                tokens.push({ type: 'Type', value: word, position: i });
            } else if (word === 'true' || word === 'false') {
                tokens.push({ type: 'BooleanLiteral', value: word, position: i });
            } else {
                tokens.push({ type: 'Identifier', value: word, position: i });
            }

            i += word.length;
            continue;
        }

        // 연산자
        if ('=+-*/'.includes(char)) {
            tokens.push({ type: 'Operator', value: char, position: i });
            i++;
            continue;
        }

        // 숫자
        if (/\d/.test(char)) {
            let num = '';
            while (i < code.length && /\d/.test(code[i])) {
                num += code[i++];
            }
            tokens.push({ type: 'NumberLiteral', value: num, position: i });
            continue;
        }

        // 알 수 없는 문자
        tokens.push({ type: 'Unknown', value: char, position: i });
        i++;
    }

    return tokens;
}
