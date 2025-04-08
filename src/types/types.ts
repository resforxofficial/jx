export type ASTNode =
    | VariableDeclarationNode
    | OutputStatementNode
    | IfStatementNode
    | InputStatementNode
    | AssignmentNode;

export type VariableDeclarationNode = {
    type: 'VariableDeclaration';
    name: string;
    varType?: string;
    value?: ExpressionNode;
};

export type AssignmentNode = {
    type: 'Assignment';
    identifier: string;
    value: ExpressionNode;
};

export type OutputStatementNode = {
    type: 'OutputStatement';
    expressions: ExpressionNode[];
};

export type IfStatementNode = {
    type: 'IfStatement';
    test: BinaryExpressionNode;
    consequent: ASTNode[];
    alternate?: ASTNode[];
};

export type InputStatementNode = {
    type: 'InputStatement';
    name: string;
    prompt: string;
};

// 공통 표현식 노드
export type ExpressionNode =
    | LiteralNode
    | IdentifierNode
    | InputExpressionNode
    | BinaryExpressionNode;

export type LiteralNode = {
    type: 'Literal';
    value: string | number | boolean;
};

export type IdentifierNode = {
    type: 'Identifier';
    name: string;
};

export type InputExpressionNode = {
    type: 'InputExpression';
    promptText: string;
};

export type BinaryExpressionNode = {
    type: 'BinaryExpression';
    left: ExpressionNode;
    operator: string;
    right: ExpressionNode;
};
