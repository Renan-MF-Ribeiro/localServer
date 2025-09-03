const jsonServer = require('json-server');
const path = require('path');

// Parse command line arguments (positional: dbFile, port)
const args = process.argv.slice(2);
let dbFile = 'db.json';
let port = 3000;
if (args[0]) {
    dbFile = args[0].endsWith('.json') ? args[0] : args[0] + '.json';
}
if (args[1]) {
    port = parseInt(args[1], 10);
}

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, dbFile));
const middlewares = jsonServer.defaults();

server.use(middlewares);


server.use(router);
const morgan = require('morgan');

server.use(morgan('combined'));

server.listen(port, () => {
    console.log(`JSON Server is running on http://localhost:${port} (DB: ${dbFile})`);
});