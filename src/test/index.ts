import * as path from 'path';
const Mocha = require('mocha');
import * as fs from 'fs';

export function run(): Promise<void> {
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 10000
    });

    const testsRoot = path.resolve(__dirname, '.');

    return new Promise((c, e) => {
        function findFiles(dir: string): string[] {
            let results: string[] = [];
            const list = fs.readdirSync(dir);
            list.forEach(file => {
                file = path.resolve(dir, file);
                const stat = fs.statSync(file);
                if (stat && stat.isDirectory()) {
                    results = results.concat(findFiles(file));
                } else if (file.endsWith('.test.js')) {
                    results.push(file);
                }
            });
            return results;
        }

        try {
            const files = findFiles(testsRoot);
            files.forEach(f => mocha.addFile(f));

            mocha.run((failures: number) => {
                if (failures > 0) {
                    e(new Error(`${failures} tests failed.`));
                } else {
                    c();
                }
            });
        } catch (err) {
            e(err);
        }
    });
}
