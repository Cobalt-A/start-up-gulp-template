import pkg from "gulp";
import browserSync from "browser-sync";
import gulpSass from "gulp-sass";
import dartSass from "sass";
import postCss from "gulp-postcss";
import cssnano from "cssnano";
import autoprefixer from "autoprefixer";
import imagemin from "gulp-imagemin";
import changed from "gulp-changed";
import concat from "gulp-concat";
import rsync from "gulp-rsync";
import { deleteAsync } from "del";
const sass = gulpSass(dartSass);
const { src, dest, parallel, series, watch } = pkg;

function browsersync() {
  browserSync.init({
    server: {
      baseDir: "public/",
    },
    ghostMode: { clicks: false },
    notify: false,
    online: true,
    // tunnel: 'yousutename', // Attempt to use the URL https://yousutename.loca.lt
  });
}

function scripts() {
  return src(["src/scripts/*.js"])
  .pipe(concat("scripts.js"))
  .pipe(dest("build/js"))
  .pipe(browserSync.stream());
}

function styles() {
  return src([`src/styles/*.*`, `!src/styles/sass/_*.*`])
  .pipe(sass({ "include css": true }))
  .pipe(
    postCss([
      autoprefixer({ grid: "autoplace" }),
      cssnano({ preset: ["default", { discardComments: { removeAll: true } }] }),
    ])
  )
  .pipe(concat("styles.css"))
  .pipe(dest("build/css"))
  .pipe(browserSync.stream());
}

function images() {
  return src(["public/images/**/*"])
  .pipe(changed("build/images/"))
  .pipe(imagemin())
  .pipe(dest("build/images/"))
  .pipe(browserSync.stream());
}

function buildcopy() {
  return src(
    ["{src/js,src/css}/*.min.*", "src/images/**/*.*", "!src/images/src/**/*", "src/fonts/**/*"],
    { base: "src/" }
  ).pipe(dest("dist"));
}

async function buildhtml() {
  let includes = new ssi("src/", "dist/", "/**/*.html");
  includes.compile();
  await deleteAsync("dist/parts", { force: true });
}

async function cleandist() {
  await deleteAsync("dist/**/*", { force: true });
}

function deploy() {
  return src("dist/").pipe(
    rsync({
      root: "dist/",
      hostname: "username@yousite.com",
      destination: "yousite/public_html/",
      clean: true, // Mirror copy with file deletion
      include: [
        /* '*.htaccess' */
      ], // Included files to deploy,
      exclude: ["**/Thumbs.db", "**/*.DS_Store"],
      recursive: true,
      archive: true,
      silent: false,
      compress: true,
    })
  );
}

function startwatch() {
  watch(`src/styles/**/*`, { usePolling: true }, styles);
  watch(["src/scripts/**/*.js"], { usePolling: true }, scripts);
  watch("public/images/**/*", { usePolling: true }, images);
  watch(`public/**/*`, { usePolling: true }).on("change", browserSync.reload);
}

export { scripts, styles, images, deploy };
export let assets = series(scripts, styles, images);
export let build = series(cleandist, images, scripts, styles, buildcopy, buildhtml);

export default series(scripts, styles, images, parallel(browsersync, startwatch));
