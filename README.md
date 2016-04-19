# gulp-ng-directive-template

This plugin will replace `templateUrl` with `template` by include the file of template into the file of js in directive of angular, to reduce a http request.

install: 
```
npm install gulp-ng-directive-template --save
```

usage:

```
var gulpNgDeirectiveTep = require('gulp-ng-directive-template');
gulp.src('**/directive/**/*.js')
    .pipe(gulpNgDeirectiveTep())
    .pipe(gulp.dest('./public/src'));
```
