import type { Token } from "./tokens.ts";

export function validate(
    tokens: Token[],
    startIndex = 0,
    declaredVars = new Set<string>(),
    initializedVars = new Set<string>(),
): number {
    // console.log("🧩 전체 토큰 목록:");
    // tokens.forEach((t, idx) => {
    //     console.log(`${idx}: ${t.type} (${t.value})`);
    // });

    let i = startIndex;

    const next = () => tokens[i++];
    const peek = () => tokens[i];

    function validateIdentifierUsage(name: string) {
        if (!declaredVars.has(name)) {
            throw new Error(`변수 "${name}" 는 선언되지 않았습니다`);
        }

        if (!initializedVars.has(name)) {
            throw new Error(`변수 "${name}" 는 초기화되지 않았습니다`);
        }
    }

    function expectSemicolon() {
        const semi = next();

        if (semi.type !== "Punctuation" || semi.value !== ";") {
            throw new Error(`세미콜론(;)이 필요합니다 (${semi.value})`);
        }
    }

    function consumeExpressionUntilSemicolon() {
        while (i < tokens.length) {
            const curr = peek();

            // expression 끝
            if (curr.type === "Punctuation" && curr.value === ";") {
                break;
            }

            // identifier validation
            if (curr.type === "Identifier") {
                validateIdentifierUsage(curr.value);
            }

            next();
        }
    }

    function consumeCondition(statementType: string) {
        const openParen = next();

        if (openParen.type !== "ParenOpen") {
            throw new Error(
                `${statementType} 문 조건은 괄호로 감싸야 합니다 (${openParen.value})`,
            );
        }

        let parenDepth = 1;

        while (i < tokens.length && parenDepth > 0) {
            const t = next();

            if (t.type === "ParenOpen") {
                parenDepth++;
            } else if (t.type === "ParenClose") {
                parenDepth--;
            }

            // 조건 안 identifier 검사
            if (t.type === "Identifier") {
                validateIdentifierUsage(t.value);
            }
        }

        if (parenDepth !== 0) {
            throw new Error(
                `${statementType} 문 조건 괄호가 올바르게 닫히지 않았습니다`,
            );
        }
    }

    function collectBlockTokens(): Token[] {
        const openBrace = next();

        if (openBrace.type !== "Punctuation" || openBrace.value !== "{") {
            throw new Error(`블록 시작에는 { 가 필요합니다 (${openBrace.value})`);
        }

        const innerTokens: Token[] = [];

        let braceDepth = 1;

        while (i < tokens.length && braceDepth > 0) {
            const t = next();

            if (t.value === "{") {
                braceDepth++;
            } else if (t.value === "}") {
                braceDepth--;
            }

            if (braceDepth > 0) {
                innerTokens.push(t);
            }
        }

        if (braceDepth !== 0) {
            throw new Error("블록이 올바르게 닫히지 않았습니다");
        }

        return innerTokens;
    }

    const parseBlock = () => {
        while (i < tokens.length) {
            const token = peek();

            // =========================
            // mut
            // =========================
            if (token.type === "Keyword" && token.value === "mut") {
                next();

                const maybeType = peek();

                if (maybeType.type === "Type") {
                    next();
                }

                const identifier = next();

                if (identifier.type !== "Identifier") {
                    throw new Error(
                        `mut 뒤에는 변수명이 와야 합니다 (${identifier.value})`,
                    );
                }

                declaredVars.add(identifier.value);

                const maybeEq = peek();

                // 초기화 없는 선언
                if (maybeEq.type === "Punctuation" && maybeEq.value === ";") {
                    expectSemicolon();
                    continue;
                }

                // =
                if (maybeEq.type !== "Operator" || maybeEq.value !== "=") {
                    throw new Error(`변수 선언에 '=' 가 필요합니다`);
                }

                next();

                // input
                if (peek()?.type === "Keyword" && peek()?.value === "input") {
                    next();

                    const content = next();

                    if (content.type !== "StringLiteral") {
                        throw new Error(
                            `입력 문구는 문자열이어야 합니다 (${content.value})`,
                        );
                    }

                    initializedVars.add(identifier.value);

                    expectSemicolon();
                    continue;
                }

                // 일반 expression
                consumeExpressionUntilSemicolon();

                initializedVars.add(identifier.value);

                expectSemicolon();
            }

            // =========================
            // assignment
            // =========================
            else if (token.type === "Identifier") {
                const identifier = next();

                validateIdentifierUsage(identifier.value);

                const eq = next();

                if (eq.type !== "Operator" || eq.value !== "=") {
                    throw new Error(`'=' 연산자가 필요합니다 (${eq.value})`);
                }

                consumeExpressionUntilSemicolon();

                expectSemicolon();

                initializedVars.add(identifier.value);
            }

            // =========================
            // out
            // =========================
            else if (token.type === "Keyword" && token.value === "out") {
                next();

                consumeExpressionUntilSemicolon();

                expectSemicolon();
            }

            // =========================
            // if
            // =========================
            else if (token.type === "Keyword" && token.value === "if") {
                next();

                consumeCondition("if");

                const innerTokens = collectBlockTokens();

                validate(innerTokens, 0, declaredVars, initializedVars);
            }

            // =========================
            // while
            // =========================
            else if (token.type === "Keyword" && token.value === "while") {
                next();

                consumeCondition("while");

                const innerTokens = collectBlockTokens();

                validate(innerTokens, 0, declaredVars, initializedVars);
            }

            // =========================
            // unknown
            // =========================
            else {
                throw new Error(`알 수 없는 문장: ${token.value}`);
            }
        }

        return i;
    };

    return parseBlock();
}
