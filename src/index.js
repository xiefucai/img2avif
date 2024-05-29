#!/usr/bin/env node

import imagemin from "imagemin";
import avif from 'imagemin-avif';
import fs from 'fs';
import path from 'path';

const GREEN = '\x1b[32m%s\x1b[0m';
const RED = '\x1b[31m%s\x1b[0m';

const parseCmdParams = (line, map = {}) => {
    const placeholder = `PLACEHOLDER`;
    const arr = [];
    const data = {};

    line
        .replace(/['"]([^'"]+)['"]/g, (_, s) => {
            const len = arr.push(s);
            return `${placeholder}_${len - 1}`;
        })
        .replace(/-{1,2}([\w-:.]+)=?(\S*)/g, (_, key, value) => {
            if (map[key]) {
                key = map[key];
            }
            if (new RegExp(`^${placeholder}_\\d+$`).test(value)) {
                const index = parseInt(value.replace(`${placeholder}_`, ''), 10);
                data[key] = arr[index];
            } else if (value.indexOf('=') > 0) {
                const d = {};
                value.replace(/([^&=]+)=?([^&=]*)/g, (_, k, v) => {
                    d[k] = decodeURIComponent(v);
                });
                data[key] = d;
            } else if (value === '' || value === 'true') {
                data[key] = true;
            } else if (value === 'false') {
                data[key] = false;
            } else if (!isNaN(value)) {
                data[key] = Number(value);
            } else {
                data[key] = value || '';
            }
        });

    return data;
};

const convert = async (args) => {
    const { in: inpath, out: outpath, quality, cwd } = args;
    const inputFile = path.resolve(cwd, inpath);
    const outputFile = path.resolve(cwd, outpath);
    // console.log('inputFile', inputFile);
    // console.log('outputFile', outputFile);
    if (!fs.existsSync(inputFile)) {
        // console.log(GREEN +' '+ RED, inputFile,  'not exists');
        // return;
        throw new Error(`${inputFile} not exists`);
    }
    const extName = path.extname(inputFile);
    const name = path.basename(inputFile);
    if (!/^\.(png|jpg|jpeg)/.test(extName)) {
        // console.log(RED, `It doesn't support convert the ${extName} file`);
        // return
        throw new Error(`It doesn't support convert the ${extName} file`);
    }
    const source = fs.readFileSync(inputFile);

    const buffer = await imagemin.buffer(source, { plugins: [avif({ quality: Number(quality) || 75 })] });
    let savedKB = (source.byteLength - buffer.length) / 1000;
    fs.writeFileSync(outputFile, buffer);
    return { savedKB, name };
};
const showHelp = () => {
    console.log(GREEN, `img2avif
    A cli program to convert png/jpg/jpeg images to avif format

Usage: img2avif --quality=[quality] --in=[inputFile] --out=[outputFile]

Arguments:
  [quality] 1-100 quality number
  [inputFile] the input file path
  [outputFile] the output file path

exp: img2avif --quality=75 --in=../test.png --out=hello.avif
  `);
};
const showVersion = async () => {
    const text = fs.readFileSync(path.join(import.meta.dirname, '../package.json'), {encoding:"utf-8"});
    const data = JSON.parse(text);
    console.log(GREEN, data.version);
}

const cmdArgs = parseCmdParams(process.argv.slice(2).join(' '), { v: 'version', h: 'help' });

if (cmdArgs.version) {
    showVersion();
} else if (cmdArgs.help || !cmdArgs.in) {
    showHelp();
} else {
    // console.log(process.cwd(), cmdArgs);
    convert({ ...cmdArgs, cwd: process.cwd() }).then(({ savedKB, name }) => {
        console.log(GREEN, `${savedKB.toFixed(1)} KB saved from '${name}'`);
        process.exit(0);
    }).catch((err) => {
        console.error(RED, err);
        process.exit(1);
    });
}
