import type { Token } from "./tokens.ts";
import type {
    ASTNode,
    LiteralNode,
    IdentifierNode,
    ExpressionNode,
} from "../types/types.ts";

const MutType = ["mut", "immut"];

export function parse(tokens: Token[]): ASTNode[] {
    let i = 0;
    const ast: ASTNode[] = [];

    const next = () => tokens[i++];
    const peek = () => tokens[i];

    const expect = (type: string, value?: string) => {
        const token = next();

        if (!token || token.type !== type || (value && token.value !== value)) {
            throw new Error(
                `파싱 에러: ${type}${value ? ` "${value}"` : ""
                } 가 필요하지만, ${token?.value ?? "EOF"} 를 받음`,
            );
        }

        return token;
    };

    // -----------------------------------
    // Expression Parser
    // -----------------------------------

    function parseExpression(): ExpressionNode {
        return parseComparison();
    }

    function parseComparison(): ExpressionNode {
        let left = parseTerm();

        while (
            peek()?.type === "Operator" &&
            ["==", "!=", "<", ">", "<=", ">="].includes(peek()!.value)
        ) {
            const operator = next().value;
            const right = parseTerm();

            left = {
                type: "BinaryExpression",
                left,
                operator,
                right,
            };
        }

        return left;
    }

    function parseTerm(): ExpressionNode {
        let left = parseFactor();

        while (peek()?.type === "Operator" && ["+", "-"].includes(peek()!.value)) {
            const operator = next().value;
            const right = parseFactor();

            left = {
                type: "BinaryExpression",
                left,
                operator,
                right,
            };
        }

        return left;
    }

    function parseFactor(): ExpressionNode {
        let left = parseUnary();

        while (peek()?.type === "Operator" && ["*", "/"].includes(peek()!.value)) {
            const operator = next().value;
            const right = parseUnary();

            left = {
                type: "BinaryExpression",
                left,
                operator,
                right,
            };
        }

        return left;
    }

    function parsePrimary(): ExpressionNode {
        const token = next();

        if (!token) {
            throw new Error("예상치 못한 EOF");
        }

        if (token.type === "NumberLiteral") {
            return {
                type: "Literal",
                value: Number(token.value),
            };
        }

        if (token.type === "StringLiteral") {
            return {
                type: "Literal",
                value: token.value,
            };
        }

        if (token.type === "BooleanLiteral") {
            return {
                type: "Literal",
                value: token.value === "true",
            };
        }

        if (token.type === "Identifier") {
            return {
                type: "Identifier",
                name: token.value,
            };
        }

        if (token.type === "ParenOpen") {
            const expr = parseExpression();
            expect("ParenClose");
            return expr;
        }

        throw new Error(`잘못된 표현식: ${token.value}`);
    }

    function parseUnary(): ExpressionNode {
        const token = peek();

        if (
            token?.type === "Operator" &&
            (token.value === "-" || token.value === "!")
        ) {
            next();

            const operand = parseUnary();

            return {
                type: "UnaryExpression",
                operator: token.value,
                operand,
            };
        }

        return parsePrimary();
    }

    // -----------------------------------
    // Block Parser
    // -----------------------------------

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

    // -----------------------------------
    // Main Parser
    // -----------------------------------

    while (i < tokens.length) {
        const token = peek();

        // -------------------------
        // Variable Declaration
        // -------------------------

        if (
            token.type === "Keyword" &&
            (token.value == MutType[0] || token.value == MutType[1])
        ) {
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
                    `변수명은 숫자로 시작할 수 없습니다: ${identifier.value}`,
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
                        value: {
                            type: "InputExpression",
                            promptText: prompt,
                        },
                        mutable: token.value === "mut",
                    });
                    continue;
                } else {
                    const value = parseExpression();
                    expect("Punctuation", ";");

                    ast.push({
                        type: "VariableDeclaration",
                        name: identifier.value,
                        varType,
                        value,
                        mutable: token.value === "mut",
                    });

                    continue;
                }
            }
            expect("Punctuation", ";");

            ast.push({
                type: "VariableDeclaration",
                name: identifier.value,
                varType,
                mutable: token.value === "mut",
            });
        }

        // -------------------------
        // Output
        // -------------------------
        else if (token.type === "Keyword" && token.value === "out") {
            next();

            const expressions: ExpressionNode[] = [];

            while (true) {
                expressions.push(parseExpression());

                const current = peek();

                if (!current) {
                    throw new Error("out 문에서 예기치 않은 EOF");
                }

                // out a, b, c;
                if (current.type === "Punctuation" && current.value === ",") {
                    next();
                    continue;
                }

                // out ... ;
                if (current.type === "Punctuation" && current.value === ";") {
                    next();
                    break;
                }

                throw new Error(
                    `out 문에서 ',' 또는 ';' 가 필요합니다 (${current.value})`,
                );
            }

            ast.push({
                type: "OutputStatement",
                expressions,
            });
        }

        // -------------------------
        // If Statement
        // -------------------------
        else if (token.type === "Keyword" && token.value === "if") {
            next();
            expect("ParenOpen");
            const condition = parseExpression();
            expect("ParenClose");
            const consequent = parseBlock();

            let alternate: ASTNode[] | undefined = undefined;

            if (peek()?.type === "Keyword" && peek()?.value === "else") {
                next();
                alternate = parseBlock();
            }

            ast.push({
                type: "IfStatement",
                test: condition,
                consequent,
                ...(alternate ? { alternate } : {}),
            });
        } else if (token.type === "Keyword" && token.value === "while") {
            next();

            expect("ParenOpen");

            const condition = parseExpression();

            expect("ParenClose");

            const body = parseBlock();

            ast.push({
                type: "WhileStatement",
                test: condition,
                body,
            });
        }

        // -------------------------
        // Input Statement
        // -------------------------
        else if (token.type === "Identifier") {
            const name = token.value;
            next();

            expect("Operator", "=");

            let value: ExpressionNode;

            // input expression
            if (peek()?.type === "Keyword" && peek()?.value === "input") {
                next();

                const prompt = expect("StringLiteral").value;

                value = {
                    type: "InputExpression",
                    promptText: prompt,
                };
            } else {
                value = parseExpression();
            }

            expect("Punctuation", ";");

            ast.push({
                type: "Assignment",
                identifier: name,
                value,
            });
        }

        // -------------------------
        // Unknown
        // -------------------------
        else {
            throw new Error(`지원되지 않는 문법 시작: ${token.value}`);
        }
    }

    return ast;
}
