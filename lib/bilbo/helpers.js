
var fs = require('fs'),
  path = require('path'),
  exec = require('child_process').exec,
  connect = require('connect');
  ghm = require('github-flavored-markdown'),
  prettify = require('../vendor/prettify');

var basePath = process.cwd();

var helpers = module.exports;

helpers.ensureDir = function ensureDir(dir, callback) {
  // todo: tweak this
  return fs.mkdir(dir, 0777, function(err) {
    return callback();
  });
};

// little helper to recursively copy a directory from src to dir
helpers.copyDir = function copyDir(src, to, callback) {
  return exec('rm -r ' + to, function(err) {
    if(err) return callback(err);
    return exec('cp -r ' + src + ' '+ to, callback);
  });
};

// escapes internal wiki anchors, in both case, prefix with config.baseurl
// except from external link. links with `//` are assumed to be external
helpers.wikiAnchors = function wikiAnchors(text, config) {
  var bu = config.baseurl;
  text = text.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, function(wholeMatch, m1, m2) {
    var ext = /\/\//.test(m2),
      p = ext ? m2 : path.join(bu, m2.split(' ').join('-'));

    return "["+m1+"](" + p + ")";
  });

  text = text.replace(/\[\[([^\]]+)\]\]/g, function(wholeMatch, m1) {
    return "["+m1+"](" + path.join(bu, m1.split(' ').join('-')) + "/)";
  });

  return text;
};

// escapes special ``` codeblock
helpers.escapeCodeBlock = function(text) {
  text = text.replace(/```(\w+)([^`]+)```/g, function(wholeMatch, language, code) {
    var lines = wholeMatch.split('\n');
    // get rid of first and last line -> ```language ànd ```
    lines = lines.slice(1, -1);


    // add desired tab space
    lines = lines.map(function(line) {
      // for some reason, external url mess up with pretiffy highligh
      return '    ' + line.replace(/(http|https):\/\//g, '');
    });

    return lines.join('\n');
  });

  return text;
};

// code highlighting helper. It uses prettify and run it against any `<pre><code>` element
helpers.codeHighlight = function codeHighlight(str) {
  return str.replace(/<code>[^<]+<\/code>/g, function (code) {
    code = code.match(/<code>([\s\S]+)<\/code>/)[1];
    code = prettify.prettyPrintOne(code);
    return "<code>" + code + "</code>";
  });
};

// markdown parser to html and makes sure that code snippets are pretty enough
helpers.toHtml = function toHtml(markdown, config) {
  return helpers.codeHighlight( ghm.parse( helpers.wikiAnchors( helpers.escapeCodeBlock( markdown ), config) ) );
};


// start up a connect server with static middleware.
helpers.server = function server(config) {
  // but only for configuration with config.server set to true (--server)
  if(!config.server) return;
  connect.createServer()
    .use(connect.logger({format: '> :date :method :url'}))
    .use(connect.favicon(path.join(__dirname, 'bilbo/templates/public/favicon.ico')))
    .use(config.baseurl || '', connect.static(path.join(config.dest)))
    .listen(config.port);

  console.log('\nServer started: localhost:', config.port);
};

// assets copy helper, fallbacks if necessary
helpers.copyAssets = function copyAssets(config) {
  var src = config.assets ? config.assets : path.resolve(__dirname, 'bilbo/templates/public'),
    to = path.resolve(config.dest, 'public');

  return helpers.copyDir(src, to, function(err) {
    if(err) throw err;
  });
};

// utilty helper to determine which layout to use. It first tries to
// get a layout template from where the excutable was used, it then fallbacks
// to the default layout.
helpers.computeLayout = function(config) {
  var layout;

  try {
    layout = fs.readFileSync(path.join(basePath, config.layout), 'utf8').toString();
  } catch (e) {
    console.log('Unable to find ', path.join(basePath, config.layout), '. Fallback to ', path.join(__dirname, 'bilbo/templates/index.html'));
    layout = fs.readFileSync(path.join(__dirname, 'bilbo/templates/index.html'), 'utf8').toString();
  }

  return layout;
};