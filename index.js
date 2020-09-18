require("dotenv").config()
const http = require("http")
const WebSocketServer = require("websocket").server
const mysql = require("mysql")

let ws_connection = null;

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
    console.log("Origin" + request.origin);
    // just require user id
    console.log('dashboard request : ' + params.get('token'));
  }else{
    // require token
    console.log('external request: ' + params.get('token'));
  }

  ws_connection = request.accept(null, request.origin)
  ws_connection.on("open", (e, req) => {
    console.log('OPENED')
    console.log(e);
    console.log(`Conn URL ${req.url}`);
  })
  ws_connection.on("close", e => console.log("Closed"))
  ws_connection.on("message", e => {
    console.log(`Received message ${e.utf8Data}`)
  })
})


httpserver.listen(8980, () => console.log("Server is listening on port 8980"));
