export type ASTNode =
    | VariableDeclarationNode
    | OutputStatementNode
    | IfStatementNode
    | InputStatementNode
    | WhileStatementNode
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
    identifier: string;
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
    | BinaryExpressionNode;

export type LiteralNode = {
    type: "Literal";
    value: string | number | boolean;
};

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
