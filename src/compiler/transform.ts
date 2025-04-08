import type {
    ASTNode,
    VariableDeclarationNode,
    OutputStatementNode,
    IfStatementNode,
    InputStatementNode,
    AssignmentNode,
    ExpressionNode,
    BinaryExpressionNode,
    LiteralNode,
    IdentifierNode,
    InputExpressionNode
} from '../types/types.ts';

export function transform(ast: ASTNode[]): string {
    const output: string[] = [];
    let usedPrompt = false;

    for (const node of ast) {
        output.push(transformNode(node));
    }

    if (usedPrompt) {
        output.unshift("import promptSync from 'prompt-sync';\nconst prompt = promptSync();");
    }

    return output.join('\n');

    // ---- 내부 헬퍼 ----

    function transformNode(node: ASTNode): string {
        switch (node.type) {
            case 'VariableDeclaration': {
                const { name, value, varType } = node as VariableDeclarationNode;

                let initializer = 'undefined';
                let tsType = 'any';

                if (value) {
                    if (value.type === 'InputExpression') {
                        usedPrompt = true;
                        const base = `prompt(${JSON.stringify(value.promptText)})`;

                        if (varType === 'str') {
                            initializer = base;
                            tsType = 'string';
                        } else if (varType === 'int') {
                            initializer = `Number(${base})`;
                            tsType = 'number';
                        } else if (varType === 'bool') {
                            initializer = `(${base} === "true")`;
                            tsType = 'boolean';
                        } else {
                            initializer = base;
                        }
                    } else {
                        tsType = mapTypeToTs(varType ?? detectLiteralType(value));
                        initializer = formatExpression(value);
                    }

                    return `let ${name}: ${tsType} = ${initializer};`;
                }

                tsType = mapTypeToTs(varType ?? 'any');
                return `let ${name}: ${tsType};`;
            }

            case 'Assignment': {
                const { identifier, value } = node as AssignmentNode;

                if (value.type === 'InputExpression') {
                    usedPrompt = true;
                    const base = `prompt(${JSON.stringify(value.promptText)})`;
                    return `${identifier} = Number(${base});`;
                }

                return `${identifier} = ${formatExpression(value)};`;
            }

            case 'OutputStatement': {
                const { expressions } = node as OutputStatementNode;
                const parts = expressions.map(expr => formatExpression(expr)).join(', ');
                return `console.log(${parts});`;
            }

            case 'IfStatement': {
                const { test, consequent, alternate } = node as IfStatementNode;

                const conditionStr = formatExpression(test);
                const thenBlock = consequent.map(transformNode).join('\n');
                const elseBlock = alternate ? `else {\n${alternate.map(transformNode).join('\n')}\n}` : '';

                return `if (${conditionStr}) {\n${thenBlock}\n}${elseBlock}`;
            }

            case 'InputStatement': {
                const { name, prompt } = node as InputStatementNode;
                usedPrompt = true;
                return `let ${name} = prompt(${JSON.stringify(prompt)});`;
            }

            default:
                const _exhaustiveCheck: never = node;
                throw new Error(`Unhandled node type: ${(node as any).type}`);
        }
    }
}

// ---- 유틸 함수 ----

function mapTypeToTs(type: string): string {
    if (type === 'str') return 'string';
    if (type === 'int') return 'number';
    if (type === 'bool') return 'boolean';
    return 'any';
}

function detectLiteralType(expr: ExpressionNode): string {
    if (expr.type === 'Literal') {
        if (typeof expr.value === 'string') return 'str';
        if (typeof expr.value === 'number') return 'int';
        if (typeof expr.value === 'boolean') return 'bool';
    }
    return 'any';
}

function formatExpression(expr: ExpressionNode): string {
    switch (expr.type) {
        case 'Literal':
            return typeof expr.value === 'string' ? JSON.stringify(expr.value) : String(expr.value);
        case 'Identifier':
            return expr.name;
        case 'InputExpression':
            return `prompt(${JSON.stringify(expr.promptText)})`;
        case 'BinaryExpression':
            return `(${formatExpression(expr.left)} ${expr.operator} ${formatExpression(expr.right)})`;
        default:
            throw new Error(`formatExpression 에러: 알 수 없는 표현식 타입 (${(expr as any).type})`);
    }
}
