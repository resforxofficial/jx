import type {
    ASTNode,
    ExpressionNode,
    VariableDeclarationNode,
    AssignmentNode,
    OutputStatementNode,
    IfStatementNode,
    WhileStatementNode,
    Scope,
} from "../types/types.ts";

export function validate(
    ast: ASTNode[],
    scope: Scope = {
        declared: new Map(),
        initialized: new Set(),
    },
) {
    function validateIdentifierUsage(name: string) {
        if (!isDeclared(name, scope)) {
            throw new Error(`변수 "${name}" 는 선언되지 않았습니다`);
        }

        if (!isInitialized(name, scope)) {
            throw new Error(`변수 "${name}" 는 초기화되지 않았습니다`);
        }
    }

    function validateExpression(node: ExpressionNode) {
        if (node.type === "Identifier") {
            validateIdentifierUsage(node.name);
            return;
        }

        if (node.type === "BinaryExpression") {
            validateExpression(node.left);
            validateExpression(node.right);
            return;
        }

        if (node.type === "Literal" || node.type === "InputExpression") {
            return;
        }
    }

    function isDeclared(name: string, scope: Scope): boolean {
        if (scope.declared.has(name)) {
            return true;
        }

        if (scope.parent) {
            return isDeclared(name, scope.parent);
        }

        return false;
    }

    function isInitialized(name: string, scope: Scope): boolean {
        if (scope.initialized.has(name)) {
            return true;
        }

        if (scope.parent) {
            return isInitialized(name, scope.parent);
        }

        return false;
    }

    function getVariable(name: string, scope: Scope) {
        if (scope.declared.has(name)) {
            return scope.declared.get(name);
        }

        if (scope.parent) {
            return getVariable(name, scope.parent);
        }

        return null;
    }

    function getExpressionType(expr: ExpressionNode, scope: Scope): string {
        if (expr.type === "Literal") {
            if (typeof expr.value === "number") {
                return "int";
            }

            if (typeof expr.value === "string") {
                return "str";
            }

            if (typeof expr.value === "boolean") {
                return "bool";
            }
        }

        if (expr.type === "Identifier") {
            const variable = getVariable(expr.name, scope);

            return variable?.type ?? "any";
        }

        if (expr.type === "InputExpression") {
            return "str";
        }

        if (expr.type === "BinaryExpression") {
            return getExpressionType(expr.left, scope);
        }

        return "any";
    }

    for (const node of ast) {
        if (node.type === "VariableDeclaration") {
            if (scope.declared.has(node.name)) {
                throw new Error(`변수 "${node.name}" 는 이미 선언되었습니다`);
            }

            // 먼저 expression 검사
            if (node.value) {
                validateExpression(node.value);
                const exprType = getExpressionType(node.value, scope);

                if (node.varType && exprType !== "any" && exprType !== node.varType) {
                    throw new Error(`타입 불일치: "${node.name}" 는 ${node.varType} 타입입니다`);
                }
            }

            // 검사 끝난 뒤 선언 처리
            scope.declared.set(node.name, {
                mutable: node.mutable,
                type: node.varType ?? "any",
            });

            if (node.value) {
                scope.initialized.add(node.name);
            }

            continue;
        }
        if (node.type === "Assignment") {
            validateIdentifierUsage(node.identifier);
            const variable = getVariable(node.identifier, scope);
            if (!variable?.mutable) {
                throw new Error(`상수 "${node.identifier}" 는 수정할 수 없습니다`);
            }

            validateExpression(node.value);
            // here
            const exprType = getExpressionType(node.value, scope);
            if (variable && exprType !== "any" && variable.type !== exprType) {
                throw new Error(`타입 불일치: "${node.identifier}" 는 ${variable.type} 타입입니다`);
            }

            scope.initialized.add(node.identifier);

            continue;
        }
        if (node.type === "OutputStatement") {
            for (const expr of node.expressions) {
                validateExpression(expr);
            }

            continue;
        }
        if (node.type === "IfStatement") {
            validateExpression(node.test);

            const childScope: Scope = {
                parent: scope,
                declared: new Map(),
                initialized: new Set(),
            };

            validate(node.consequent, childScope);

            if (node.alternate) {
                const alternateScope: Scope = {
                    parent: scope,
                    declared: new Map(),
                    initialized: new Set(),
                };

                validate(node.alternate, alternateScope);
            }

            continue;
        }
        if (node.type === "WhileStatement") {
            validateExpression(node.test);

            const childScope: Scope = {
                parent: scope,
                declared: new Map(),
                initialized: new Set(),
            };

            validate(node.body, childScope);

            continue;
        }

        throw new Error(`지원되지 않는 AST 노드: ${node.type}`);
    }
}
