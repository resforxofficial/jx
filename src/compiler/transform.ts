export function transform(code: string): string {
    return code
        .replace(/mut\s+str\s+(\w+)\s*=\s*"(.*?)";/g, 'let $1 = "$2";')
        .replace(/out\s+(\w+);/g, 'print($1);');
}
