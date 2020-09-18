require("dotenv").config()
const http = require("http")
const WebSocketServer = require("websocket").server
const mysql = require("mysql")

let ws_clients = [];
let ws_dashies = [];
let users = [];

let db_connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user : process.env.DB_USER,
    password : process.env.DB_PWD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT
});


db_connection.connect((err) => {
  if (err) {
    console.log("NOOOPE! Err: " + err)
  }else {
    console.log("Connected");
  }
})

db_connection.query("SELECT id, api_token FROM users", (err, rows) => {
  if(err) throw err;
  console.log(rows);
  users = rows;
})

const httpserver = http.createServer((req, res) => {
  console.log("we have received a request");
})

const websocket = new WebSocketServer({
  "httpServer" : httpserver
})

websocket.on("request", request => {
  let params = new URLSearchParams(String(request.httpRequest.url).slice(2));

  if (request.origin == process.env.DASH_ORIGIN) {
    // Request from dashboard
    if(users.filter(u => u.id == params.get('token')).length === 1){
      console.log('user legit, register dashy')
      let dashy = bindDash({
        'id' : params.get('token'),
        'connection' : request.accept(null, request.origin)
      })

      if (ws_dashies.filter(d => d.id == params.get('token')).length){
        // existing connection, override
        ws_dashies.filter(d => d.id == params.get('token'))[0] = dashy
      }else{
        // register new item for this user
        ws_dashies.push(dashy)
      }
    }else{
      request.reject('Wrong token - Invalid user id');
    }
  }else{
    // Request from student clients
    console.log('external request: ' + params.get('token'));
    if(users.filter(u => u.api_token == params.get('token')).length === 1) {
      let usr = users.filter(u => u.api_token == params.get('token'))[0];

      let newCon = {
        'userId' : usr.id,
        'connection' : request.accept(null, request.origin)
      }
      ws_clients.push(bindClient(newCon))
      newCon.connection.send('Welcome, take a seat!')
    }else{
      request.reject('Wrong token');
    }

  }
})


function bindDash(dash)
{
  dash.connection.on("open", (e, req) => {
    console.log('OPENED')
    console.log(e);
    console.log(`Conn URL ${req.url}`);
  })
  dash.connection.on("close", e => console.log("Closed"))
  dash.connection.on("message", e => {
    console.log(`Received message ${e.utf8Data}`)
  })
  return dash;
}

function bindClient(usrItem)
{
  usrItem.connection.on("open", (e, req) => {
    console.log('OPENED')
    console.log(e);
    console.log(`Conn URL ${req.url}`);
  })
  usrItem.connection.on("close", e => console.log("Closed"))
  usrItem.connection.on("message", e => {
    console.log(`Received message ${e.utf8Data}`)

    ws_dashies
      .filter(d => d.id == usrItem.userId)
      .forEach(d => {
        d.connection.send(e.utf8Data)
      })

  })
  return usrItem;
}

httpserver.listen(8980, () => console.log("Server is listening on port 8980"));

