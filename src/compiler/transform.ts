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

    const expect = (type: string, value?: string) => {
        const token = next();
        if (!token || token.type !== type || (value && token.value !== value)) {
            throw new Error(`transform 에러: ${type}${value ? ` "${value}"` : ''} 가 필요하지만 ${token?.value ?? 'EOF'} 를 받음`);
        }
        return token;
    };

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
                    const value = next(); // 예: "hello" 또는 123

                    // ⛔ 타입 강제 체크 추가
                    if (type && detectLiteralType(value) !== type.value) {
                        throw new Error(`타입 불일치: '${type.value}' 타입에 '${value.value}' 값을 할당할 수 없습니다`);
                    }

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

        // if 문
        else if (token.type === 'Keyword' && token.value === 'if') {
            next(); // consume 'if'

            expect('ParenOpen', '(');
            let condition = '';

            // 조건 표현식 파싱
            let expectingOperand = true;
            while (true) {
                const current = peek();
                if (!current) throw new Error('if 조건이 비정상적으로 종료되었습니다');
                if (current.type === 'ParenClose') {
                    next(); // consume ')'
                    break;
                }

                if (expectingOperand) {
                    if (!['Identifier', 'NumberLiteral', 'BooleanLiteral'].includes(current.type)) {
                        throw new Error(`if 조건에서 잘못된 피연산자: ${current.value}`);
                    }
                    condition += current.value;
                    next();
                    expectingOperand = false;
                } else {
                    if (current.type !== 'Operator') {
                        throw new Error(`if 조건에서 연산자가 필요합니다: ${current.value}`);
                    }
                    condition += ` ${current.value} `;
                    next();
                    expectingOperand = true;
                }
            }

            // { 블록 시작
            expect('Punctuation', '{');
            output.push(`if (${condition}) {`);

            // 블록 내 구문 처리
            while (true) {
                const current = peek();
                if (!current) throw new Error('if 블록이 닫히지 않았습니다');
                if (current.type === 'Punctuation' && current.value === '}') {
                    next(); // consume '}'
                    break;
                }

                // 재귀적으로 transform 호출 대신 기존 루프 로직을 재활용
                // => 단순히 한 문장 단위 처리
                const innerStart = i;
                const innerResult = transform(tokens.slice(innerStart));
                output.push(innerResult);
                break; // 단순 구현을 위해 한 줄 처리
            }

            output.push('}');

            // else 블록
            const maybeElse = peek();
            if (maybeElse && maybeElse.type === 'Keyword' && maybeElse.value === 'else') {
                next(); // consume 'else'
                expect('Punctuation', '{');
                output.push('else {');

                while (true) {
                    const current = peek();
                    if (!current) throw new Error('else 블록이 닫히지 않았습니다');
                    if (current.type === 'Punctuation' && current.value === '}') {
                        next(); // consume '}'
                        break;
                    }

                    const innerStart = i;
                    const innerResult = transform(tokens.slice(innerStart));
                    output.push(innerResult);
                    break;
                }

                output.push('}');
            }

            continue;
        }


        // 출력문
        else if (token.type === 'Keyword' && token.value === 'out') {
            next(); // out

            let expression = '';
            let expectingOperand = true;

            while (true) {
                const current = peek();

                if (!current) throw new Error('예상치 못한 EOF');
                if (current.type === 'Punctuation' && current.value === ';') {
                    next(); // consume ';'
                    break;
                }

                if (expectingOperand) {
                    if (!['Identifier', 'StringLiteral', 'NumberLiteral', 'BooleanLiteral'].includes(current.type)) {
                        throw new Error(`out 구문에서 피연산자가 유효하지 않습니다: ${current.value}`);
                    }

                    if (current.type === 'Identifier') {
                        expression += current.value;
                    } else {
                        expression += formatValueByType(current, detectLiteralType(current));
                    }

                    next();
                    expectingOperand = false;
                } else {
                    if (current.type !== 'Operator') {
                        throw new Error(`out 구문에서 연산자가 필요합니다: ${current.value}`);
                    }

                    expression += ` ${current.value} `;
                    next();
                    expectingOperand = true;
                }
            }

            output.push(`console.log(${expression});`);
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
