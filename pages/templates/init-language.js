var fs = require('fs');
var path = require('path');
var stringify = require('json-stable-stringify');

var files = fs.readdirSync(path.join(__dirname, 'i18n'));

function readLanguage(files) {
  return Object.assign.apply(Object, files.filter(function(file) {
    return /\.fr\.json$/.test(file);
  }).map(function(file) {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n', file)));
  }));
}

var allKnowledge = readLanguage(files);
console.log('Found ' + Object.keys(allKnowledge).length + ' keys');

var sourceFiles  = files.filter(function(file) {
  return /\.template\.json$/.test(file);
});
var translatedFiles = files.filter(function(file) {
  return /\.fr\.json$/.test(file);
});
console.log('Found ' + (sourceFiles.length - translatedFiles.length) + ' to init');

var toInit = sourceFiles.map(function(file) {
  return file.slice(0, - '.json'.length) + '.fr.json';
}).filter(function(file) {
  return translatedFiles.indexOf(file) === -1;
}).map(function(file) {
  return {
    source: file.slice(0, - '.fr.json'.length) + '.json',
    target: file,
  };
});

toInit.forEach(function(file) {
  var source = JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n', file.source)).toString());
  var sourceKeys = Object.keys(source);
  var target = {};
  var hits = 0;

  for(var i = 0, len = sourceKeys.length; i < len; i++) {
    var key = sourceKeys[i];
    if (allKnowledge[key]) {
      hits++;
    }
    target[key] = allKnowledge[key] || '';
  }

  fs.writeFileSync(path.join(__dirname, 'i18n', file.target), stringify(target, {space: 2}));
  console.log(file.source, '->', file.target, '(' + hits, 'keys reused)');
});

console.log('Trying to improve ' + translatedFiles.length + ' files');
translatedFiles.forEach(function(file) {
  var target = JSON.parse(fs.readFileSync(path.join(__dirname, 'i18n', file)).toString());
  var targetKeys = Object.keys(target);
  var hits = 0;

  for(var i = 0, len = targetKeys.length; i < len; i++) {
    var key = targetKeys[i];
    if (allKnowledge[key] && target[key] === '') {
      target[key] = allKnowledge[key];
      hits++;
    }
  }

  fs.writeFileSync(path.join(__dirname, 'i18n', file), stringify(target, {space: 2}));
  console.log(file, '(' + hits, 'keys reused)');
});
