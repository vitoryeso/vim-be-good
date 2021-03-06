import { Neovim, NvimPlugin, Buffer } from 'neovim';
import wait from './wait';
import { GameState, GameOptions } from './game/types';
import { BaseGame, newGameState } from './game/base';

export class DeleteGame extends BaseGame {
    constructor(nvim: Neovim, state: GameState, opts: GameOptions = {
        difficulty: 'easy'
    }) {
        super(nvim, state);
    }

    async run() {
        const high = Math.random() > 0.5;
        const midPoint = this.state.lineLength / 2 + this.state.lineRange.start;
        const line = this.midPointRandomPoint(midPoint, high);
        const lines = new Array(this.state.lineLength).fill('');
        lines[line] = "                              DELETE ME";

        await this.nvim.command(`:${String(this.midPointRandomPoint(midPoint, !high))}`);
        await this.state.buffer.setLines(lines, {
            start: this.state.lineRange.start,
            end: this.state.lineRange.end,
            strictIndexing: true
        });
    }

    async clear() {
        const len = await this.state.buffer.length;
        await this.state.buffer.remove(0, len, true);
        await this.state.buffer.insert(new Array(this.state.lineRange.end).fill(''), 0);
    }

    async checkForWin(state: GameState): Promise<boolean> {
        const lines = await state.buffer.getLines({
            start: state.lineRange.start,
            end: await state.buffer.length,
            strictIndexing: false
        });

        const length = lines.map(l => l.trim()).join('').length;
        return length === 0;
    }
}

export async function runGame(game: BaseGame) {
    try {
        for (let i = 0; i < 3; ++i) {
            await game.debugTitle("Game is starting in", String(3 - i), "...");
        }

        await game.setTitle("Game Started: ",
                            game.state.currentCount + 1,
                            "/", game.state.ending.count);
        await game.clear();
        await game.run();

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

        async function onLineEvent(...args: any[]) {
            const startOfFunction = Date.now();

            if (used) {
                missingCount++;
                return;
            }

            used = true;

            try {
                if (!(await game.checkForWin(game.state))) {
                    reset();
                    return;
                }

                game.state.results.push(startOfFunction - start);
                if (game.state.currentCount >= game.state.ending.count) {
                    await game.setTitle(`Average!: ${game.state.results.reduce((x, y) => x + y, 0) / game.state.results.length}`);
                    game.finish();
                    return;
                }
                else {
                    await game.setTitle(`Round ${game.state.currentCount + 1} / ${game.state.ending.count}`);
                }

                game.state.currentCount++;

                await game.clear();
                await game.run();
                start = Date.now();
            } catch (e) {
                game.debugTitle("onLineEvent#error", e.message);
            }
            reset();
        }

        game.onLines(onLineEvent);
    } catch (err) {
        await game.nvim.outWrite(`Failure ${err}\n`);
    }
}

const availableGames = ["relative"];
export default function(plugin: NvimPlugin) {
    plugin.setOptions({
        dev: true,
        alwaysInit: true,
    });

    plugin.registerCommand("VimBeGood2", async (args: string[]) => {
        try {
            const buffer = await plugin.nvim.buffer;
            const length = await buffer.length;
            const lines = await buffer.getLines({
                start: 0,
                end: length,
                strictIndexing: true
            });

            const lengthOfLines = lines.reduce((acc, x) => acc + x, "").trim().length;

            if (lengthOfLines > 0) {
                plugin.nvim.errWriteLine("Your file is not empty.")
                return;
            }

            const bufferOutOfMyMind = await plugin.nvim.buffer;
            const state = newGameState(bufferOutOfMyMind);
            let game: BaseGame;

            if (args[0] === "relative") {
                game = new DeleteGame(plugin.nvim, state);
            }

            // TODO: ci?
            else {
                await plugin.nvim.outWrite("VimBeGood: <gameName>  -- Available Games: " + availableGames.join() + "\n");
                return;
            }

            runGame(game);

        } catch (e) {
            await plugin.nvim.outWrite("Error#" + args + " " + e.message);
        }
    }, { sync: false, nargs: "*" });
};
