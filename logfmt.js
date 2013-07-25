var split = require('split');
var through = require('through');

var parse = require('./lib/logfmt_parser').parse;

exports.parse = parse;

exports.stream = process.stdout;

exports.log = function(data, stream) {
  if(stream == undefined) stream = exports.stream;

  var line = '';
  Object.keys(data).forEach(function(key){
    var value = data[key].toString();
    if(value.indexOf(' ') > -1) value = '"' + value + '"';
    line += key + '=' + value + ' ';
  })

  //trim traling space and print w. newline
  stream.write(line.substring(0,line.length-1) + "\n");
}


//Syncronous Body Parser
var bodyParser = require('./lib/body_parser')

var logfmtBodyParser = function (body) {
  var lines = []
  body.split("\n").forEach(function(line){
    lines.push(parse(line))
  })
  return lines;
}

exports.bodyParser = function() {
  return bodyParser({content_type: "application/logplex-1", parser: logfmtBodyParser})
}

//Stream Body Parser
var Readable = require('readable-stream').Readable;
var bodyParserStream = function(options){

  return function(req, res, next) {
    if (req._body) return next();
    var is_logplex = req.get('content-type') === "application/logplex-1";
    if (!is_logplex) return next();
    req._body = true;
    if(!req.body){
      req.body = new Readable({ objectMode: true });
      req.body._read = function(n) {
        req.body._paused = false;
      };
    }

    function parseLine(line) {
      console.log('line :' + line);
      if(line) {
        var parsedLine = parse(line);
        if(!req.body._paused) req.body._paused = !req.body.push(parsedLine);
      }
    }
    function end() { console.log('END'); req.body.push(null); }
    req.pipe(split()).pipe(through(parseLine, end));

    return next();
  }
}

exports.bodyParserStream = bodyParserStream;
