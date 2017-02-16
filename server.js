'use strict'

const http = require('http')
const r = require('rethinkdb')
require('rethinkdb-init')(r)

const j = (obj) => JSON.stringify(obj, null, '  ')

const checkIfDBConnectionIsValid = (rethinkdbHost) => {
  return r.init({
    host: rethinkdbHost,
    db: process.env.DB_NAME || 'hello_node_rethinkdb'
  }, [
    rethinkdbHost,
    process.env.TABLE_NAME || 'master'
  ])
    .then(function (conn) {
      console.log(`Getting db list for '${rethinkdbHost}' ...`)
      return Promise.all([r.dbList().run(conn), r.tableList().run(conn)])
    })
   .spread(function (dbList, tableList) {
      console.log(`DB and table list for ${rethinkdbHost} ...`, dbList, tableList)
      return { dbList, tableList }
    })
}

http.createServer(function (req, res) {
  let opts = {
    IS_MIRRORED_DOCKERFILE: process.env.IS_MIRRORED_DOCKERFILE,
    RUNNABLE_CONTAINER_ID: process.env.RUNNABLE_CONTAINER_ID,
    RETHINKDB_3: process.env.RETHINKDB_3,
    RETHINKDB_4: process.env.RETHINKDB_4,
    HOSTNAME: process.env.HOSTNAME
  }
  if (process.env.NAME) {
    opts.NAME = process.env.NAME
  }
  res.writeHead(200, {'Content-Type': 'application/json'})
  if (!process.env.RETHINKDB_3 || !process.env.RETHINKDB_4) {
    console.log('One of the necessary `RETHINKDB` ENV vars not set')
    res.end(j({
      message: 'Hello: Not enough RethinkDB Variables set',
      opts
    }))
  }
  console.log('Connecting to Rethinkdb...')
  return Promise.all([
    // Hosts and ENVs set in docker-compose.yml file
    checkIfDBConnectionIsValid('rethinkdb1'),
    checkIfDBConnectionIsValid('some-weird-host'),
    checkIfDBConnectionIsValid(process.env.RETHINKDB_3),
    checkIfDBConnectionIsValid(process.env.RETHINKDB_4)
  ])
    .then(hosts => {
     res.end(j({
        message: 'Hello: Succesfully connected to DB',
        opts,
        hosts
      }))
    })
    .catch(function (err) {
      console.log('Error: ', err)
      res.end(j({
        message: '!!! Error connecting to DB !!!',
        opts,
        err
      }))
    })
}).listen(process.env.PORT || 80)

console.log(`Server running at port ${process.env.PORT}`)
