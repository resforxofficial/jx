import type { Token } from './tokens.ts';

const RESERVED_KEYWORDS = ['mut', 'out', 'str'];

export function validate(tokens: Token[]): void {
    tokens.forEach((token, i) => {
        // 변수명 검사
        if (token.type === 'Identifier') {
            if (!/^[_a-zA-Z][_a-zA-Z0-9]*$/.test(token.value)) {
                throw new Error(`잘못된 변수명: '${token.value}' (숫자로 시작하거나 특수문자 사용 금지)`);
            }

            if (RESERVED_KEYWORDS.includes(token.value)) {
                throw new Error(`예약어 '${token.value}' 는 변수명으로 사용할 수 없습니다.`);
            }
        }

        // 키워드 + 타입 붙은 경우 예외 (예: mutstr)
        if (token.type === 'Identifier' && i > 0) {
            const prev = tokens[i - 1];
            if (prev.type === 'Keyword' && token.value.startsWith('str')) {
                throw new Error(`'${prev.value}${token.value}' 는 유효하지 않은 문법입니다. '${prev.value} str' 처럼 띄어쓰기를 해주세요.`);
            }
        }

        // 세미콜론 누락 검사 (간단한 방식: 다음 줄 시작이 Keyword인데 이전 줄 마지막이 세미콜론이 아님)
        if (
            i < tokens.length - 1 &&
            token.type === 'Identifier' &&
            tokens[i + 1].type === 'Keyword' &&
            tokens[i - 1]?.value !== ';'
        ) {
            throw new Error(`세미콜론 누락: '${token.value}' 뒤에 ';' 이 필요합니다.`);
        }
    });
}
