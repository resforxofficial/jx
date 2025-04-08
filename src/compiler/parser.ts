import type { Token } from "./tokens.ts";
import type { ASTNode, LiteralNode, IdentifierNode } from "../types/types.ts";

export function parse(tokens: Token[]): ASTNode[] {
    let i = 0;
    const ast: ASTNode[] = [];

    const next = () => tokens[i++];
    const peek = () => tokens[i];
    const expect = (type: string, value?: string) => {
        const token = next();
        if (!token || token.type !== type || (value && token.value !== value)) {
            throw new Error(
                `파싱 에러: ${type}${value ? ` "${value}"` : ""} 가 필요하지만, ${token?.value ?? "EOF"
                } 를 받음`
            );
        }
        return token;
    };

    function makeExprNode(token: Token): LiteralNode | IdentifierNode {
        if (token.type === "Identifier") {
            return { type: "Identifier", name: token.value };
        } else if (token.type === "BooleanLiteral") {
            return { type: "Literal", value: token.value === "true" };
        } else {
            return { type: "Literal", value: JSON.parse(token.value) };
        }
    }

    function parseBlock(): ASTNode[] {
        const block: Token[] = [];
        expect("Punctuation", "{");
        let braceCount = 1;
        while (i < tokens.length) {
            const t = next();
            if (t.type === "Punctuation") {
                if (t.value === "{") braceCount++;
                if (t.value === "}") braceCount--;
            }
            if (braceCount === 0) break;
            block.push(t);
        }
        return parse(block);
    }

    while (i < tokens.length) {
        const token = peek();

        if (token.type === "Keyword" && token.value === "mut") {
            next();
            const maybeTypeOrIdent = next();
            let identifier;
            let varType;

            if (maybeTypeOrIdent.type === "Type") {
                varType = maybeTypeOrIdent.value;
                identifier = expect("Identifier");
            } else if (maybeTypeOrIdent.type === "Identifier") {
                identifier = maybeTypeOrIdent;
            } else {
                throw new Error(`mut 다음에는 타입 또는 식별자가 와야 합니다.`);
            }

            if (/^[0-9]/.test(identifier.value)) {
                throw new Error(
                    `변수명은 숫자로 시작할 수 없습니다: ${identifier.value}`
                );
            }

            const maybeEq = peek();
            if (maybeEq?.type === "Operator" && maybeEq.value === "=") {
                next();
                const maybeInput = peek();
                if (maybeInput.type === "Keyword" && maybeInput.value === "input") {
                    next();
                    const prompt = expect("StringLiteral").value;
                    expect("Punctuation", ";");

                    ast.push({
                        type: "VariableDeclaration",
                        name: identifier.value,
                        varType,
                        value: { type: "InputExpression", promptText: prompt },
                    });
                    continue;
                } else {
                    const valueToken = next();
                    expect("Punctuation", ";");

                    ast.push({
                        type: "VariableDeclaration",
                        name: identifier.value,
                        varType,
                        value: {
                            type: "Literal",
                            value: makeExprNode(valueToken),
                        },
                    });
                    continue;
                }
            }

            expect("Punctuation", ";");
            ast.push({
                type: "VariableDeclaration",
                name: identifier.value,
                varType,
            });
        } else if (token.type === "Keyword" && token.value === "out") {
            next();
            const expressions: (LiteralNode | IdentifierNode)[] = [];
            let expectingOperand = true;

            while (true) {
                const current = peek();
                if (!current) throw new Error("out 문에서 예기치 않은 EOF");
                if (current.type === "Punctuation" && current.value === ";") {
                    next();
                    break;
                }

                if (expectingOperand) {
                    if (
                        ![
                            "Identifier",
                            "StringLiteral",
                            "NumberLiteral",
                            "BooleanLiteral",
                        ].includes(current.type)
                    ) {
                        throw new Error(
                            `out 구문에서 피연산자가 유효하지 않습니다: ${current.value}`
                        );
                    }
                    expressions.push(
                        current.type === "Identifier"
                            ? { type: "Identifier", name: current.value }
                            : { type: "Literal", value: JSON.parse(current.value) }
                    );
                    next();
                    expectingOperand = false;
                } else {
                    throw new Error(`현재는 out에서 연산자 없이 단순 나열만 지원`);
                }
            }

            ast.push({
                type: "OutputStatement",
                expressions,
            });
        } else if (token.type === "Keyword" && token.value === "if") {
            next();
            expect("ParenOpen");

            const left = next();
            const operator = next();
            const right = next();

            if (
                ![
                    "Identifier",
                    "NumberLiteral",
                    "BooleanLiteral",
                    "StringLiteral",
                ].includes(left.type)
            ) {
                throw new Error(`조건식의 왼쪽이 잘못됨: ${left.value}`);
            }
            if (
                operator.type !== "Operator" ||
                !["==", "!=", "<", ">", "<=", ">="].includes(operator.value)
            ) {
                throw new Error(`조건문에 잘못된 연산자: ${operator.value}`);
            }
            if (
                ![
                    "Identifier",
                    "NumberLiteral",
                    "BooleanLiteral",
                    "StringLiteral",
                ].includes(right.type)
            ) {
                throw new Error(`조건식의 오른쪽이 잘못됨: ${right.value}`);
            }

            expect("ParenClose");
            const consequent = parseBlock();

            let alternate: ASTNode[] | undefined = undefined;
            if (peek()?.type === "Keyword" && peek()?.value === "else") {
                next();
                alternate = parseBlock();
            }

            ast.push({
                type: "IfStatement",
                test: {
                    type: "BinaryExpression",
                    left: makeExprNode(left),
                    operator: operator.value,
                    right: makeExprNode(right),
                },
                consequent,
                ...(alternate ? { alternate } : {}),
            });
        } else if (token.type === "Identifier") {
            const name = token.value;
            next();
            expect("Operator", "=");
            expect("Keyword", "input");
            const prompt = expect("StringLiteral").value;
            expect("Punctuation", ";");

            ast.push({
                type: "InputStatement",
                name,
                prompt,
            });
        } else {
            throw new Error(`지원되지 않는 문법 시작: ${token.value}`);
        }
    }

    return ast;
}
