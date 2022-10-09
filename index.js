const ftpd = require('ftpd')
const fs = require('fs')
const path = require('path')

require('dotenv').config()

var keyFile
var certFile
var server

// use the IP and PORT from the .env file or default to localhost:21
var options = {
  host: process.env.IP || '127.0.0.1',
  port: process.env.PORT || 21,
  tls: null,
}

// Check if SSL KEY / CERT are provided ELSE start without SSL support
if (process.env.KEY_FILE && process.env.CERT_FILE) {
  console.log('Running as FTPS server')
  if (process.env.KEY_FILE.charAt(0) !== '/') {
    keyFile = path.join(__dirname, process.env.KEY_FILE)
  }
  if (process.env.CERT_FILE.charAt(0) !== '/') {
    certFile = path.join(__dirname, process.env.CERT_FILE)
  }
  options.tls = {
    key: fs.readFileSync(keyFile),
    cert: fs.readFileSync(certFile),
    ca: !process.env.CA_FILES
      ? null
      : process.env.CA_FILES.split(':').map(function (f) {
          return fs.readFileSync(f)
        }),
  }
} else {
  console.log()
  console.log('###### To run as FTPS server, #####')
  console.log('### set "KEY_FILE", "CERT_FILE" ###')
  console.log('###### or "CA_FILES" env vars. ####')
  console.log()
}

// get ftp root directory listing
server = new ftpd.FtpServer(options.host, {
  getInitialCwd: function () {
    return '/ftproot'
  },
  getRoot: function () {
    return process.cwd()
  },
  pasvPortRangeStart: 1025,
  pasvPortRangeEnd: 1050,
  tlsOptions: options.tls,
  allowUnauthorizedTls: true,
  useWriteFile: false,
  useReadFile: false,
  uploadMaxSlurpSize: 7000, // N/A unless 'useWriteFile' is true.
  allowedCommands: [
    'XMKD',
    'AUTH',
    'TLS',
    'SSL',
    'USER',
    'PASS',
    'PWD',
    'OPTS',
    'TYPE',
    'PORT',
    'PASV',
    'LIST',
    'CWD',
    'MKD',
    'SIZE',
    'STOR',
    'MDTM',
    'DELE',
    'QUIT',
  ],
})

server.on('error', function (error) {
  console.log('FTP Server error:', error)
})

// verify user and password from .env file
server.on('client:connected', function (connection) {
  var username = null

  console.log('client connected: ' + connection.remoteAddress)

  connection.on('command:user', function (user, success, failure) {
    if (user) {
      username = process.env.USER
      success()
    } else {
      failure()
    }
  })

  connection.on('command:pass', function (pass, success, failure) {
    if (process.env.PWD) {
      success(username)
    } else {
      failure()
    }
  })
})

server.debugging = 4
server.listen(options.port)
console.log('Listening on port ' + options.port)