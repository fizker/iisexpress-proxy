#!/usr/bin/env node

var os = require('os'),
    http = require('http'),
    proxy = require('http-proxy'),
    pkg = require('./package');

var exit = function() {
  var bin = Object.keys(pkg.bin)[0];
  console.log('Usage examples:');
  console.log('\t%s 51123 to 3000', bin);
  console.log('\t%s [http(s)://]192.168.0.100:51123 to 3000', bin);
  console.log('\t%s [http://]domain.com:80 to 3000', bin);
  console.log('\t%s [https://]ssl-domain.com:443 to 3000', bin);
  console.log();
  process.exit();
};

console.log('IIS Express Proxy %s', pkg.version);

if (process.argv.length != 5 || process.argv[3].toLowerCase() !== 'to') {
  exit();
}

var source = process.argv[2].match(/^(https?:\/\/)?(.+?)(?:\:(\d+))$/);
var protocolPrefix = 'http://',
    host = 'localhost',
    port, proxyPort;

if (source === null) {
  port = parseInt(process.argv[2], 10);
} else {
  protocolPrefix = source[1] || 'https://';
  host = source[2];
  port = parseInt(source[3], 10);
}
proxyPort = parseInt(process.argv[4], 10);

if (isNaN(port) || isNaN(proxyPort)) {
  exit();
}

console.log('Proxying %s%s:%d to network interfaces:', protocolPrefix, host, port);

var interfaces = os.networkInterfaces();

Object.keys(interfaces).forEach(function(name) {
  interfaces[name].filter(function(item) {
    return item.family == 'IPv4' && !item.internal;
  }).forEach(function(item) {
    console.log("\t%s: %s:%s", name, item.address, proxyPort);
  });
});

var proxyServer = proxy.createProxyServer({
  target: protocolPrefix + host + ':' + port,
  secure: false,
  changeOrigin: true
}).on('error', function (err, req, res) {
  console.log(err.stack);
  console.log('Listening... [press Control-C to exit]');
  res.writeHead(500, {
    'Content-Type': 'text/plain'
  });
  res.end('Aw snap! Something went wrong. Check your console to see the error.');
});

var server = http.createServer(function(req, res) {
  // replace res.writeHead
  var _writeHead = res.writeHead;
  res.writeHead = function(statusCode, statusMessage, headers) {
    if(headers === undefined) {
      headers = statusMessage;
      statusMessage = undefined;
    }

    if(headers && headers.location) {
      headers.location = headers.location.replace(new RegExp('(.*)localhost:' + port + '(.*)', 'i'), '$1' + host + ':' + proxyPort + '$2')
    }

    _writeHead.apply(this, arguments);
  };
  proxyServer.web(req, res);
});
server.listen(proxyPort, function() {
  console.log('Listening... [press Control-C to exit]');
});
