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

        if (node.type === "UnaryExpression") {
            validateExpression(node.operand);
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

        if (expr.type === "UnaryExpression") {
            if (expr.operator === "!") {
                const operandType = getExpressionType(expr.operand, scope);

                if (operandType !== "bool") {
                    throw new Error(`! 연산자는 bool 타입만 사용할 수 있습니다`);
                }

                return "bool";
            }

            if (expr.operator === "-") {
                return getExpressionType(expr.operand, scope);
            }
        }

        if (expr.type === "Identifier") {
            const variable = getVariable(expr.name, scope);

            return variable?.type ?? "any";
        }

        if (expr.type === "InputExpression") {
            return "str";
        }

        if (expr.type === "ArrayLiteral") {
            if (expr.elements.length === 0) {
                return "any[]";
            }

            const firstType = getExpressionType(expr.elements[0], scope);

            for (const el of expr.elements) {
                const elementType = getExpressionType(el, scope);

                if (elementType !== firstType) {
                    throw new Error("배열 요소 타입이 일치하지 않습니다");
                }
            }

            return `${firstType}[]`;
        }

        if (expr.type === "IndexExpression") {
            const arrayType = getExpressionType(expr.array, scope);
            const indexType = getExpressionType(expr.index, scope);

            if (indexType !== "int") {
                throw new Error("배열 인덱스는 int 타입이어야 합니다");
            }

            if (!arrayType.endsWith("[]")) {
                throw new Error("배열이 아닌 값에 인덱싱할 수 없습니다");
            }

            return arrayType.slice(0, -2);
        }
        if (expr.type === "MemberExpression") {
            const objType = getExpressionType(expr.object, scope);
            if (!objType.endsWith("[]")) {
                throw new Error("배열이 아닌 값의 속성에 접근할 수 없습니다");
            }

            if (["length", "first", "last"].includes(expr.property)) {
                return expr.property === "length" ? "int" : objType.slice(0, -2);
            }

            if (expr.property === "empty") {
                return "bool";
            }
            throw new Error(`알 수 없는 배열 속성: ${expr.property}`);
        }

        if (expr.type === "BinaryExpression") {
            const leftType = getExpressionType(expr.left, scope);

            const rightType = getExpressionType(expr.right, scope);

            // 산술 연산
            if (["+", "-", "*", "/"].includes(expr.operator)) {
                if (leftType !== "int" || rightType !== "int") {
                    throw new Error(`산술 연산은 int 타입만 가능합니다`);
                }

                return "int";
            }

            if (["&&", "||"].includes(expr.operator)) {
                if (leftType !== "bool" || rightType !== "bool") {
                    throw new Error(`논리 연산은 bool 타입만 가능합니다`);
                }

                return "bool";
            }

            // 비교 연산
            if (["==", "!=", ">", "<", ">=", "<="].includes(expr.operator)) {
                if (leftType !== rightType) {
                    throw new Error(`비교 연산 타입이 서로 다릅니다`);
                }

                return "bool";
            }
        }

        return "any";
    }

    for (const node of ast) {
        if (node.type === "VariableDeclaration") {
            if (isDeclared(node.name, scope)) {
                throw new Error(`변수 "${node.name}" 는 이미 선언되었습니다`);
            }

            if (!node.mutable && !node.value) {
                throw new Error(`상수 "${node.name}" 는 반드시 초기화되어야 합니다`);
            }

            // 먼저 expression 검사
            if (node.value) {
                validateExpression(node.value);
                const exprType = getExpressionType(node.value, scope);

                if (node.value?.type === "InputExpression") {
                    scope.declared.set(node.name, {
                        type: node.varType ?? "any",
                        mutable: node.mutable,
                    });

                    scope.initialized.add(node.name);
                    continue;
                }

                if (node.varType && exprType !== "any" && exprType !== "any[]" && exprType !== node.varType) {
                    throw new Error(
                        `타입 불일치: "${node.name}" 는 ${node.varType} 타입입니다`,
                    );
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
            if (
                node.target.type !== "Identifier" &&
                node.target.type !== "IndexExpression"
            ) {
                throw new Error("아직 변수 이외의 대입은 지원되지 않습니다");
            }

            if (node.target.type === "Identifier") {
                // 초기화 검사(validateIdentifierUsage) 대신 선언 여부만 먼저 검사합니다.
                if (!isDeclared(node.target.name, scope)) {
                    throw new Error(`변수 "${node.target.name}" 는 선언되지 않았습니다`);
                }

                const variable = getVariable(node.target.name, scope);
                if (!variable?.mutable) {
                    throw new Error(`상수 "${node.target.name}" 는 수정할 수 없습니다`);
                }
                //

                validateExpression(node.value);
                const exprType = getExpressionType(node.value, scope);

                if (variable && exprType !== "any" && variable.type !== exprType) {
                    throw new Error(
                        `타입 불일치: "${node.target.name}" 는 ${variable.type} 타입입니다`,
                    );
                }

                scope.initialized.add(node.target.name);
                continue;
            } else if (node.target.type === "IndexExpression") {
                validateExpression(node.target);

                if (node.target.array.type !== "Identifier") {
                    throw new Error("복잡한 배열 대입은 아직 지원되지 않습니다");
                }

                const variable = getVariable(node.target.array.name, scope);
                if (!variable?.mutable) {
                    throw new Error(
                        `상수 "${node.target.array.name}" 는 수정할 수 없습니다`,
                    );
                }

                if (node.value.type === "InputExpression") {
                    continue;
                }
                const arrayType = getExpressionType(node.target, scope);
                const valueType = getExpressionType(node.value, scope);

                if (arrayType !== valueType && valueType !== "any") {
                    throw new Error("배열 원소 타입과 대입하려는 값의 타입이 일치하지 않습니다");
                }

                continue;
            }
        }
        if (node.type === "OutputStatement") {
            for (const expr of node.expressions) {
                validateExpression(expr);
                getExpressionType(expr, scope);
            }

            continue;
        }
        if (node.type === "IfStatement") {
            validateExpression(node.test);

            const testType = getExpressionType(node.test, scope);
            if (testType !== "bool") {
                throw new Error(`if 조건식은 bool 타입이어야 합니다`);
            }

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

            const testType = getExpressionType(node.test, scope);
            if (testType !== "bool") {
                throw new Error(`while 조건식은 bool 타입이어야 합니다`);
            }

            const childScope: Scope = {
                parent: scope,
                declared: new Map(),
                initialized: new Set(),
            };

            validate(node.body, childScope);

            continue;
        }
        if (node.type === "ForStatement") {
            const forScope: Scope = {
                parent: scope,
                declared: new Map(),
                initialized: new Set(),
            };

            validate([node.init], forScope);
            validateExpression(node.test);
            const testType = getExpressionType(node.test, forScope);
            
            if (testType !== "bool") {
                throw new Error(`for 조건식은 bool 타입이어야 합니다`);
            }

            validate(node.body, forScope);
            continue;
        }

        throw new Error(`지원되지 않는 AST 노드: ${node.type}`);
    }
}
