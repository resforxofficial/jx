import type { Token } from './tokens.ts';

export function validate(tokens: Token[]): void {
    let i = 0;
    const declaredVars = new Set<string>();

    const next = () => tokens[i++];
    const peek = () => tokens[i];

    while (i < tokens.length) {
        const token = peek();

        if (token.type === 'Keyword' && token.value === 'mut') {
            next(); // mut
            const type = next(); // str, int, bool
            const identifier = next(); // 변수명

            declaredVars.add(identifier.value);

            const maybeEq = peek();
            if (maybeEq?.type === 'Operator' && maybeEq.value === '=') {
                next(); // =
                next(); // value
            }

            const semi = next();
            if (semi.value !== ';') {
                throw new Error(`세미콜론(;)이 필요합니다 (${semi.value})`);
            }
        }

        else if (token.type === 'Keyword' && token.value === 'out') {
            next(); // out
            const target = next(); // Identifier 또는 Literal

            if (target.type === 'Identifier' && !declaredVars.has(target.value)) {
                throw new Error(`변수 "${target.value}" 는 선언되지 않았습니다`);
            }

            const semi = next();
            if (semi.value !== ';') {
                throw new Error(`세미콜론(;)이 필요합니다 (${semi.value})`);
            }
        }

        else {
            throw new Error(`알 수 없는 문장: ${token.value}`);
        }
    }
}
