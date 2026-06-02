export type TokenType =
    | "Keyword" // mut, out 등
    | "Type" // str, int, bool
    | "Identifier" // 변수명
    | "Operator" // =, +, -, *, /
    | "StringLiteral" // "hello"
    | "NumberLiteral" // 123
    | "BooleanLiteral" // true, false
    | "Punctuation" // ;, :, .
    | "ParenOpen" // (
    | "ParenClose" // )
    | "Unknown" // 알 수 없는 문법
    | "BracketOpen"
    | "BracketClose"
    | "BraceOpen"
    | "BraceClose";

export interface Token {
    type: TokenType;
    value: string;
    position: number;
}

const KEYWORDS = new Set([
    "mut",
    "out",
    "input",
    "if",
    "else",
    "while",
    "immut",
]);

const TYPES = new Set(["str", "int", "bool"]);

const BOOLEANS = new Set(["true", "false"]);

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

        // 괄호
        if (char === "(") {
            tokens.push({ type: "ParenOpen", value: "(", position: i });
            i++;
            continue;
        }

        if (char === ")") {
            tokens.push({ type: "ParenClose", value: ")", position: i });
            i++;
            continue;
        }

        if (char === "[") {
            tokens.push({ type: "BracketOpen", value: char, position: i });
            i++;
            continue;
        }

        if (char === "]") {
            tokens.push({ type: "BracketClose", value: char, position: i });
            i++;
            continue;
        }

        // 중괄호
        if (char === "{") {
            tokens.push({ type: "BraceOpen", value: "{", position: i });
            i++;
            continue;
        }

        if (char === "}") {
            tokens.push({ type: "BraceClose", value: "}", position: i });
            i++;
            continue;
        }

        // 구두점
        if ([";", ":", ".", ","].includes(char)) {
            tokens.push({ type: "Punctuation", value: char, position: i });
            i++;
            continue;
        }

        // 문자열 리터럴
        if (char === '"') {
            let value = "";
            i++; // 첫 따옴표 건너뜀
            while (i < code.length && code[i] !== '"') {
                value += code[i++];
            }
            i++; // 닫는 따옴표
            tokens.push({ type: "StringLiteral", value, position: i });
            continue;
        }

        // 단어 (키워드, 타입, 변수명 등)
        const wordMatch = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(code.slice(i));
        if (wordMatch) {
            const word = wordMatch[0];

            // 키워드인지 확인
            if (KEYWORDS.has(word)) {
                tokens.push({
                    type: "Keyword",
                    value: word,
                    position: i,
                });
            } else if (TYPES.has(word)) {
                tokens.push({
                    type: "Type",
                    value: word,
                    position: i,
                });
            } else if (BOOLEANS.has(word)) {
                tokens.push({
                    type: "BooleanLiteral",
                    value: word,
                    position: i,
                });
            } else {
                tokens.push({
                    type: "Identifier",
                    value: word,
                    position: i,
                });
            }

            i += word.length;
            continue;
        }

        // 숫자 리터럴
        if (/\d/.test(char)) {
            let num = "";
            while (i < code.length && /\d/.test(code[i])) {
                num += code[i++];
            }
            tokens.push({ type: "NumberLiteral", value: num, position: i });
            continue;
        }

        // 두 글자 연산자 결합 체크 (&&, ||, ==, !=, >=, <=)
        const nextChar = code[i + 1];
        const twoCharOp = char + nextChar;

        if (["==", "!=", ">=", "<=", "&&", "||"].includes(twoCharOp)) {
            tokens.push({ type: "Operator", value: twoCharOp, position: i });
            i += 2;
            continue;
        }

        // 단일 글자 연산자 체크
        if ("=+-*/!><".includes(char)) {
            tokens.push({ type: "Operator", value: char, position: i });
            i += 1;
            continue;
        }

        // 알 수 없는 문자
        tokens.push({ type: "Unknown", value: char, position: i });
        i++;
    }

    return tokens;
}
