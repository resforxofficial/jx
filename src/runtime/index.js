"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.print = void 0;
function print() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    console.log.apply(console, args);
}
exports.print = print;
