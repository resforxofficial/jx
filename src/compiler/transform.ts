import type { Token } from './tokens.ts';

export function transform(tokens: Token[]): string {
    let i = 0;
    const output: string[] = [];
    let usedPrompt = false;

    const next = () => tokens[i++];
    const peek = () => tokens[i];

    function expectSemicolon() {
        const semi = next();
        if (semi.type !== 'Punctuation' || semi.value !== ';') {
            throw new Error('세미콜론이 필요합니다');
        }
    }

    while (i < tokens.length) {
        const token = peek();

        // 변수 선언
        if (token.type === 'Keyword' && token.value === 'mut') {
            next(); // mut

            const maybeTypeOrId = next();
            let type: Token | null = null;
            let identifier: Token;

            if (maybeTypeOrId.type === 'Type') {
                type = maybeTypeOrId;
                identifier = next();
            } else {
                identifier = maybeTypeOrId;
            }

            const maybeEq = peek();
            if (maybeEq?.type === 'Operator' && maybeEq.value === '=') {
                next(); // =

                const maybeInput = peek();

                // 입력문: mut [type] a = input "내용";
                if (maybeInput?.type === 'Keyword' && maybeInput.value === 'input') {
                    next(); // input
                    const str = next(); // "내용"
                    expectSemicolon();  // ;

                    usedPrompt = true;
                    const promptCall = `prompt(${JSON.stringify(str.value)})`;

                    let wrappedPrompt: string;
                    if (!type) {
                        wrappedPrompt = `Number(${promptCall})`; // 기본은 숫자 처리
                    } else if (type.value === 'str') {
                        wrappedPrompt = promptCall;
                    } else if (type.value === 'int') {
                        wrappedPrompt = `Number(${promptCall})`;
                    } else if (type.value === 'bool') {
                        wrappedPrompt = `(${promptCall} === "true")`;
                    } else {
                        wrappedPrompt = promptCall;
                    }

                    const tsType = type ? mapTypeToTs(type.value) : 'number';
                    output.push(`let ${identifier.value}: ${tsType} = ${wrappedPrompt};`);
                }

                // 일반 리터럴 초기화
                else {
                    const value = next();
                    expectSemicolon();

                    const inferredType = type ? type.value : detectLiteralType(value);
                    const tsType = type ? mapTypeToTs(type.value) : mapTypeToTs(inferredType);
                    const formattedValue = formatValueByType(value, inferredType);

                    output.push(`let ${identifier.value}: ${tsType} = ${formattedValue};`);
                }
            }

            // 선언만 하는 경우
            else {
                expectSemicolon();
                const tsType = type ? mapTypeToTs(type.value) : 'any';
                output.push(`let ${identifier.value}: ${tsType};`);
            }
        }

        // 출력문
        else if (token.type === 'Keyword' && token.value === 'out') {
            next(); // out

            const left = next();
            const maybeOp = peek();

            if (maybeOp?.type === 'Operator') {
                const op = next(); // +
                const right = next();
                expectSemicolon();

                output.push(`console.log(${left.value} ${op.value} ${right.value});`);
            } else {
                expectSemicolon();
                if (left.type === 'Identifier') {
                    output.push(`console.log(${left.value});`);
                } else {
                    const outValue = formatValueByType(left, detectLiteralType(left));
                    output.push(`console.log(${outValue});`);
                }
            }
        }

        // 변수 = input "문장"; (타입 생략)
        else if (token.type === 'Identifier') {
            const identifier = next();
            const assign = next();
            const keyword = next();
            const str = next();
            const semi = next();

            if (
                assign.type === 'Operator' && assign.value === '=' &&
                keyword.type === 'Keyword' && keyword.value === 'input' &&
                str.type === 'StringLiteral' &&
                semi.value === ';'
            ) {
                usedPrompt = true;
                output.push(`${identifier.value} = Number(prompt(${JSON.stringify(str.value)}));`);
            } else {
                throw new Error(`transform 에러: 잘못된 input 문입니다 (${identifier.value})`);
            }
        }

        else {
            throw new Error(`transform 에러: 지원하지 않는 문장입니다 (${token.value})`);
        }
    }

    if (usedPrompt) {
        output.unshift("import promptSync from 'prompt-sync';\nconst prompt = promptSync();");
    }

    return output.join('\n');
}

function mapTypeToTs(type: string): string {
    if (type === 'str') return 'string';
    if (type === 'int') return 'number';
    if (type === 'bool') return 'boolean';
    return 'any';
}

function formatValueByType(token: Token, type: string): string {
    if (type === 'str') return JSON.stringify(token.value);
    return token.value;
}

function detectLiteralType(token: Token): string {
    if (token.type === 'StringLiteral') return 'str';
    if (token.type === 'NumberLiteral') return 'int';
    if (token.type === 'BooleanLiteral') return 'bool';
    return 'any';
}
