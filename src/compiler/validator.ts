import type { Token } from "./tokens.ts";

export function validate(
    tokens: Token[],
    startIndex = 0,
    declaredVars = new Set<string>(),
    initializedVars = new Set<string>(),
): number {
    console.log("🧩 전체 토큰 목록:");
    tokens.forEach((t, idx) => {
        console.log(`${idx}: ${t.type} (${t.value})`);
    });

    let i = startIndex;

    const next = () => tokens[i++];
    const peek = () => tokens[i];

    const parseBlock = () => {
        while (i < tokens.length) {
            const token = peek();

            if (token.type === "Keyword" && token.value === "mut") {
                next();
                const maybeType = peek();
                if (maybeType.type === "Type") next();

                const identifier = next();
                declaredVars.add(identifier.value);

                const maybeEq = peek();
                if (maybeEq?.type === "Operator" && maybeEq.value === "=") {
                    next();
                    const maybeInput = peek();
                    if (maybeInput?.type === "Keyword" && maybeInput.value === "input") {
                        next();
                        const content = next();
                        if (content.type !== "StringLiteral") {
                            throw new Error(
                                `입력 문구는 문자열로 제공되어야 합니다 (${content.value})`,
                            );
                        }
                        const semi = next();
                        if (semi.type !== "Punctuation" || semi.value !== ";") {
                            throw new Error(`세미콜론(;)이 필요합니다 (${semi.value})`);
                        }
                        initializedVars.add(identifier.value);
                        continue;
                    }

                    const value = next();
                    if (
                        !["StringLiteral", "NumberLiteral", "BooleanLiteral"].includes(
                            value.type,
                        )
                    ) {
                        throw new Error(`잘못된 초기화 값입니다 (${value.value})`);
                    }

                    initializedVars.add(identifier.value);
                }

                const semi = next();
                if (semi.type !== "Punctuation" || semi.value !== ";") {
                    throw new Error(`세미콜론(;)이 필요합니다 (${semi.value})`);
                }
            } else if (token.type === "Identifier") {
                const identifier = next();
                if (!declaredVars.has(identifier.value)) {
                    throw new Error(`변수 "${identifier.value}" 는 선언되지 않았습니다`);
                }

                const eq = next();
                if (eq.type !== "Operator" || eq.value !== "=") {
                    throw new Error(`'=' 연산자가 필요합니다 (${eq.value})`);
                }

                const inputKeyword = next();
                if (inputKeyword.type !== "Keyword" || inputKeyword.value !== "input") {
                    throw new Error(`input 키워드가 필요합니다 (${inputKeyword.value})`);
                }

                const content = next();
                if (content.type !== "StringLiteral") {
                    throw new Error(
                        `입력 문구는 문자열로 제공되어야 합니다 (${content.value})`,
                    );
                }

                const semi = next();
                if (semi.value !== ";") {
                    throw new Error(`세미콜론(;)이 필요합니다 (${semi.value})`);
                }

                initializedVars.add(identifier.value);
            } else if (token.type === "Keyword" && token.value === "out") {
                next();

                let expectingOperand = true;
                while (i < tokens.length) {
                    const curr = peek();
                    if (curr.type === "Punctuation" && curr.value === ";") break;

                    if (expectingOperand) {
                        if (curr.type === "Identifier") {
                            if (!declaredVars.has(curr.value)) {
                                throw new Error(`변수 "${curr.value}" 는 선언되지 않았습니다`);
                            }
                            if (!initializedVars.has(curr.value)) {
                                throw new Error(
                                    `변수 "${curr.value}" 는 초기화되지 않았습니다`,
                                );
                            }
                        }

                        if (
                            !["Identifier", "StringLiteral", "NumberLiteral"].includes(
                                curr.type,
                            )
                        ) {
                            throw new Error(
                                `out 문에서 피연산자가 잘못되었습니다 (${curr.value})`,
                            );
                        }

                        next();
                        expectingOperand = false;
                    } else {
                        if (curr.type !== "Operator") {
                            throw new Error(`out 문에서 연산자가 필요합니다 (${curr.value})`);
                        }
                        next();
                        expectingOperand = true;
                    }
                }

                if (expectingOperand) {
                    throw new Error("out 문 마지막에 피연산자가 필요합니다");
                }

                const semi = next();
                if (semi.type !== "Punctuation" || semi.value !== ";") {
                    throw new Error(`세미콜론(;)이 필요합니다 (${semi.value})`);
                }
            } else if (token.type === "Keyword" && token.value === "if") {
                next(); // if

                const openParen = next();

                if (openParen.type !== "ParenOpen") {
                    throw new Error(
                        `if 문 조건은 괄호로 감싸야 합니다 (${openParen.value})`,
                    );
                }

                // 괄호 끝까지 그냥 스킵
                let parenDepth = 1;

                while (i < tokens.length && parenDepth > 0) {
                    const t = next();

                    if (t.type === "ParenOpen") parenDepth++;
                    else if (t.type === "ParenClose") parenDepth--;
                }

                const openBrace = next();

                if (openBrace.type !== "Punctuation" || openBrace.value !== "{") {
                    throw new Error(`if 문 뒤에는 { 가 필요합니다 (${openBrace.value})`);
                }

                const innerTokens: Token[] = [];
                let braceDepth = 1;

                while (i < tokens.length && braceDepth > 0) {
                    const t = next();

                    if (t.value === "{") braceDepth++;
                    else if (t.value === "}") braceDepth--;

                    if (braceDepth > 0) {
                        innerTokens.push(t);
                    }
                }

                if (braceDepth !== 0) {
                    throw new Error("if 문 블록이 올바르게 닫히지 않았습니다");
                }

                validate(innerTokens, 0, declaredVars, initializedVars);
            } else {
                throw new Error(`알 수 없는 문장: ${token.value}`);
            }
        }

        return i; // <- 이게 핵심!
    };

    return parseBlock();
}
