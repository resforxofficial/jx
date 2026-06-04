export type ASTNode =
    | VariableDeclarationNode
    | OutputStatementNode
    | IfStatementNode
    | InputStatementNode
    | WhileStatementNode
    | ForStatementNode
    | AssignmentNode;

export type VariableDeclarationNode = {
    type: "VariableDeclaration";
    name: string;
    varType?: string;
    value?: ExpressionNode;
    mutable: boolean;
};

export type WhileStatementNode = {
    type: "WhileStatement";
    test: ExpressionNode;
    body: ASTNode[];
};

export type AssignmentNode = {
    type: "Assignment";
    target: ExpressionNode;
    value: ExpressionNode;
};

export type OutputStatementNode = {
    type: "OutputStatement";
    expressions: ExpressionNode[];
};

export type IfStatementNode = {
    type: "IfStatement";
    test: ExpressionNode;
    consequent: ASTNode[];
    alternate?: ASTNode[];
};

export type InputStatementNode = {
    type: "InputStatement";
    name: string;
    prompt: string;
};

// 공통 표현식 노드
export type ExpressionNode =
    | LiteralNode
    | IdentifierNode
    | InputExpressionNode
    | UnaryExpressionNode
    | BinaryExpressionNode
    | ArrayLiteralNode
    | MemberExpressionNode
    | IndexExpressionNode;

export type LiteralNode = {
    type: "Literal";
    value: string | number | boolean;
};

export type MemberExpressionNode = {
    type: "MemberExpression";
    object: ExpressionNode;
    property: string;
}; // 👈 이 줄 추가

export type IdentifierNode = {
    type: "Identifier";
    name: string;
};

export type InputExpressionNode = {
    type: "InputExpression";
    promptText: string;
};

export type BinaryExpressionNode = {
    type: "BinaryExpression";
    left: ExpressionNode;
    operator: string;
    right: ExpressionNode;
};

export type Scope = {
    parent?: Scope;

    declared: Map<string, { mutable: boolean; type: string }>;
    initialized: Set<string>;
};

export type UnaryExpressionNode = {
    type: "UnaryExpression";
    operator: string;
    operand: ExpressionNode;
};

export type ForStatementNode = {
    type: "ForStatement";
    init: ASTNode;         // int i = 0 (변수 선언 노드)
    test: ExpressionNode;         // i < 5 (자동 조립될 비교식 노드)
    updateOperator: "+" | "-"; // 증감 방향
    iteratorName: string;  // "i" (증감할 변수 이름)
    body: ASTNode[];
};

export type ArrayLiteralNode = {
    type: "ArrayLiteral";
    elements: ExpressionNode[];
};

export type IndexExpressionNode = {
    type: "IndexExpression";
    array: ExpressionNode;
    index: ExpressionNode;
};
