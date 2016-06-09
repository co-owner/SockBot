'use strict'


const fs = require('fs'),
    dmd = require('dmd'),
    jsdoc = require('jsdoc-parse'),
    mkdirp = require('mkdirp'),
    path = require('path');

const git = require('simple-git')('.');

const docDest = path.join('docs', 'api');

function getChanges(filter) {
    return new Promise((resolve, reject) => {
        git.log({
            from: 'HEAD~1',
            to: 'HEAD'
        }, (logErr, logData) => {
            if (logErr) {
                return reject(logErr);
            }
            git.show([logData.latest.hash], (err, diff) => {
                if (err) {
                    return reject(err);
                }
                const files = {};
                diff.split('\n').map((line) => {
                    const file = /^diff --git a\/(.*) b\/(.*)/.exec(line);
                    if (file && file[1] == file[2]) {
                        files[file[1]] = 1;
                    }
                });
                resolve(Object.keys(files).filter((file) => filter.test(file)));
            });
        });
    });
}

function documentPath(toDoc) {
    return new Promise((resolve, reject) => {
        const dir = path.join(docDest, path.dirname(toDoc)),
            name = `${path.basename(toDoc, '.js') }.md`,
            dest = path.join(dir, name);
        mkdirp(dir, (err) => {
            if (err) {
                reject();
            }
            try {
                const inFile = fs.createReadStream(toDoc);
                const outFile = fs.createWriteStream(dest);
                inFile.pipe(jsdoc()).pipe(dmd()).pipe(outFile);
                inFile.on('error', (err) => reject(err));
                outFile.on('error', (err) => reject(err));
                outFile.on('finish', () => resolve(dest));
            } catch (err2) {
                reject(err2);
            }
        });
    });
}

function verifyDocument(file) {
    return new Promise((resolve, reject) => {
        fs.stat(file, (err, stats) => {
            if (err) {
                return reject(err);
            }
            const origFile = `.${file.replace(/[.]md$/, '.js').slice(docDest.length)}`;
            if (stats.size === 0) {
                console.warn(`${origFile} has no jsdocs, please consider adding some.`);
                return removeStale(origFile).then(resolve, reject);
            }
            git.add(file, () => resolve());
        });
    });
}

function removeStale(file) {
    return new Promise((resolve) => {
        const dir = path.join(docDest, path.dirname(file)),
            name = `${path.basename(file, '.js') }.md`,
            dest = path.join(dir, name);
        git.silent(true).rm(dest, (err) => {
            if (err) {
                fs.unlink(dest, () => resolve());
            } else {
                resolve();
            }
        });
    });
}

function processFile(file) {
    return documentPath(file).then((dest) => {
        return verifyDocument(dest);
    }, (err) => {
        if (err.code === 'ENOENT') {
            return removeStale(file);
        }
    });
}

function commitDocs(){
    return new Promise((resolve,reject)=>{
        git.commit(['docs: Update API Documentation'], (err)=>{err?reject(err):resolve()});
    });
}

getChanges(/[.]js$/i)
    .then((files) => Promise.all(files.map((file) => processFile(file))))
    .then(commitDocs)
    .then(() => console.log('done'))
    .catch((err) => console.log(err));