"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = require("./game/base");
class DeleteGame extends base_1.BaseGame {
    constructor(nvim, state) {
        super(nvim, state);
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            const high = Math.random() > 0.5;
            const midPoint = this.state.lineLength / 2 + this.state.lineRange.start;
            const line = this.midPointRandomPoint(midPoint, high);
            const lines = new Array(this.state.lineLength).fill('');
            lines[line] = "                              DELETE ME";
            yield this.nvim.command(`:${String(this.midPointRandomPoint(midPoint, !high))}`);
            yield this.state.buffer.setLines(lines, {
                start: this.state.lineRange.start,
                end: this.state.lineRange.end,
                strictIndexing: true
            });
        });
    }
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            const len = yield this.state.buffer.length;
            yield this.state.buffer.remove(0, len, true);
            yield this.state.buffer.insert(new Array(this.state.lineRange.end).fill(''), 0);
        });
    }
    checkForWin(state) {
        return __awaiter(this, void 0, void 0, function* () {
            const lines = yield state.buffer.getLines({
                start: state.lineRange.start,
                end: yield state.buffer.length,
                strictIndexing: false
            });
            const length = lines.map(l => l.trim()).join('').length;
            return length === 0;
        });
    }
}
exports.DeleteGame = DeleteGame;
function runGame(game) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            for (let i = 0; i < 3; ++i) {
                yield game.debugTitle("Game is starting in", String(3 - i), "...");
            }
            yield game.setTitle("Game Started: ", game.state.currentCount + 1, "/", game.state.ending.count);
            yield game.clear();
            yield game.run();
            let start = Date.now();
            let missingCount = 0;
            let used = false;
            function reset() {
                used = false;
                if (missingCount > 0) {
                    missingCount = 0;
                    onLineEvent([]);
                }
            }
            function onLineEvent(...args) {
                return __awaiter(this, void 0, void 0, function* () {
                    const startOfFunction = Date.now();
                    if (used) {
                        missingCount++;
                        return;
                    }
                    used = true;
                    try {
                        if (!(yield game.checkForWin(game.state))) {
                            reset();
                            return;
                        }
                        game.state.results.push(startOfFunction - start);
                        if (game.state.currentCount >= game.state.ending.count) {
                            yield game.setTitle(`Average!: ${game.state.results.reduce((x, y) => x + y, 0) / game.state.results.length}`);
                            game.finish();
                            return;
                        }
                        else {
                            yield game.setTitle(`Round ${game.state.currentCount + 1} / ${game.state.ending.count}`);
                        }
                        game.state.currentCount++;
                        yield game.clear();
                        yield game.run();
                        start = Date.now();
                    }
                    catch (e) {
                        game.debugTitle("onLineEvent#error", e.message);
                    }
                    reset();
                });
            }
            game.onLines(onLineEvent);
        }
        catch (err) {
            yield game.nvim.outWrite(`Failure ${err}\n`);
        }
    });
}
exports.runGame = runGame;
const availableGames = ["relative"];
function default_1(plugin) {
    plugin.setOptions({
        dev: true,
        alwaysInit: true,
    });
    plugin.registerCommand("VimBeGood2", (args) => __awaiter(this, void 0, void 0, function* () {
        try {
            const buffer = yield plugin.nvim.buffer;
            const length = yield buffer.length;
            const lines = yield buffer.getLines({
                start: 0,
                end: length,
                strictIndexing: true
            });
            const lengthOfLines = lines.reduce((acc, x) => acc + x, "").trim().length;
            if (lengthOfLines > 0) {
                plugin.nvim.errWriteLine("Your file is not empty.");
                return;
            }
            const bufferOutOfMyMind = yield plugin.nvim.buffer;
            const state = base_1.newGameState(bufferOutOfMyMind);
            let game;
            if (args[0] === "relative") {
                game = new DeleteGame(plugin.nvim, state);
            }
            // TODO: ci?
            else {
                yield plugin.nvim.outWrite("VimBeGood: <gameName>  -- Available Games: " + availableGames.join() + "\n");
                return;
            }
            runGame(game);
        }
        catch (e) {
            yield plugin.nvim.outWrite("Error#" + args + " " + e.message);
        }
    }), { sync: false, nargs: "*" });
}
exports.default = default_1;
;
