#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const wrench = require('wrench')
const { argv } = require('yargs')
const { nativePath, force } = argv
const pack = require("./package.json")
const watchFiles = pack["wach-files"] || []

const onFileChanged = (event, f) => {
    console.log({ event, f })
    if (event === 'change') {
        fs.copyFileSync(f, path.join(nativePath, f))
    } else if (event === 'rename') {
        if (fs.existsSync(f)) {
            fs.copyFileSync(f, path.join(nativePath, f))
        } else {
            fs.unlinkSync(path.join(nativePath, f))
        }
    }
}

const onDirChanged = (event, dir) => {
    console.log({ event, dir })
    if (event === 'change') {
        wrench.copyDirSyncRecursive(dir, path.join(nativePath, dir))
    } else if (event === 'rename') {
        if (!fs.existsSync(dir)) {
            wrench.rmdirSyncRecursive(path.join(nativePath, dir))
        } else {
            wrench.copyDirSyncRecursive(dir, path.join(nativePath, dir))
        }
    }
}

const watchFile = filename => {
    fs.watch(filename, onFileChanged)
}

const watchDir = dir => {
    fs.watch(dir, { recursive: true }, (event, filename) => {
        console.log({ dir, event, filename })
        const isChangedDir =
            fs.existsSync(path.join(dir, filename))
                ? fs.statSync(path.join(dir, filename)).isDirectory()
                : fs.statSync(path.join(nativePath, dir, filename)).isDirectory()
        if (isChangedDir) {
            onDirChanged(event, path.join(dir, filename))
        } else {
            onFileChanged(event, path.join(dir, filename))
        }
    })
}

const forceCopyAllWatchedFiles = (nativePath) => {
    wrench.rmdirSyncRecursive(nativePath)
    fs.mkdirSync(nativePath)
    watchFiles.forEach(file => {
        if (fs.existsSync(file)) {
            if (fs.statSync(file).isDirectory()) {
                wrench.copyDirSyncRecursive(file, path.join(nativePath, file))
            } else {
                fs.copyFileSync(file, path.join(nativePath, file))
            }
        } else {
            console.log(`${file} does not exist`)
        }
    })
}

if (nativePath) {
    if (force) {
        forceCopyAllWatchedFiles(nativePath)
    }
    watchFiles.forEach(watchedFileOrPath => {
        if (fs.statSync(watchedFileOrPath).isDirectory()) {
            watchDir(watchedFileOrPath)
        } else {
            watchFile(watchedFileOrPath)
        }
    })
} else {
    console.error('--nativePath is required')
}
