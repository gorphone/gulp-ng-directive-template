'use strict';
var htmlJsStr = require('js-string-escape');
var through = require('through2');
var path = require('path');
var fs = require('fs');

var getDirectiveContent = function (content) {
    var struct = '.directive(function(){return{templateUrl:}})'.split('');
    var i = 0, n = content.length, matched = false, s = 0;
    var stack = [], paths = [];
    var src = {
        str: ''
    };
    while (i++ < n) {
        var char = content[i];
        if (char === ' ' || char === '\n' || char === '\t' || char === '\r') {
            continue;
        }
        if (s < 11) { // .directive(
            if (char !== struct[s]) {
                s = 0;
            } else {
                s++;
            }
            continue;
        }

        if (s < 20) { // function(
            if (char === ')') {
                s = 0;
                continue;
            }
            if (char !== struct[s]) {
                s = 11;
            } else {
                s++;
            }
            continue;
        }

        if (s < 22) { // ){
            if (char !== struct[s]) {
                s = 20;
            } else {
                s++;
            }
            continue;
        }

        if (s === 22 && ['{', '[', '('].indexOf(char) > -1) {
            stack.push(char);
            continue;
        }

        if (s === 22 && stack.length && ['}', ']', ')'].indexOf(char) > -1) {
            stack.pop();
            continue;
        }

        if (s === 22 && stack.length) {
            continue;
        }

        if (s < 29) { // return{
            if (char === '}') {
                s = 11;
                continue;
            }
            if (char !== struct[s]) {
                s = 22;
            } else {
                s++;
            }
            continue;
        }

        if (['{', '[', '('].indexOf(char) > -1) {
            stack.push(char);
            continue;
        }

        if (stack.length && ['}', ']', ')'].indexOf(char) > -1) {
            stack.pop();
            continue;
        }

        if (!stack.length) {
            if (char === '}') {
                paths.push(src);
                src = {
                    str: ''
                };
                s = 0;
                continue;
            }

            if (s < 41) { // templateUrl:'
                if (char !== struct[s]) {
                    s = 29;
                } else {
                    s === 40 && (src.start = i - 11); // 回溯得到匹配的开始位置
                    s++;
                }
                continue;
            }

            if (char === '\'' || char === '"') {
                matched = !matched;
                s++;
                continue;
            }

            if (matched) {
                src.str += char;
            } else {
                src.end = i;
                s = 29;
            }
        }
    }

    console.log(paths);

    return paths;
};

var resolvePaths = function (base, paths) {
    var dir = path.dirname(base);

    paths.map(function (item) {
        var file = path.resolve(dir, item.str);

        if (fs.existsSync(file)) {
            var filecontent = fs.readFileSync(file, 'utf-8');
            item.content = htmlJsStr(filecontent);
        }
    });

    return paths;
};

var replaceTemplate = function (paths, content) {
    var offset = 0;
    paths.forEach(function (item) {
        var len = item.end - item.start;
        var replacer = 'template: \'' + item.content + '\'';

        content.splice(item.start - offset, len, replacer);
        offset += (len - 1);
    });
};

module.exports = function () {
    return through.obj(function (file, enc, cb) {
        var chunk = String(file.contents);

        var content = chunk.split('');
        var paths = getDirectiveContent(content);

        paths = resolvePaths(file.path, paths);

        replaceTemplate(paths, content);

        file.contents = new Buffer(content.join(''));
        cb(null, file);
    });
};
