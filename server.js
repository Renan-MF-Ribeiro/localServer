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
server.use((req, res, next) => {
    const db = router.db; // lowdb instance
    const collection = req.path.split('/')[1];
    if (collection && !db.has(collection).value()) {
        db.set(collection, []).write();
    }
    next();
});

server.use((req, res, next) => {
    if (req.query.paginated) {
        // Clone req.query and remove pageIndex/pageSize for db.get
        const { pageIndex, pageSize, ...rest } = req.query;
        const collection = req.path.split('/')[1];
        const db = router.db;
        let items = db.get(collection);

        // Apply filters if any
        Object.keys(rest).forEach(key => {
            items = items.filter(item => String(item[key]) === String(rest[key]));
        });

        const total = items.size().value();
        const page = parseInt(pageIndex, 10) || 0;
        const size = parseInt(pageSize, 10) || 10;
        const data = items.slice(page * size, (page + 1) * size).value();
        return res.json({ data, total });
    }
    next();
});



server.use(router);
const morgan = require('morgan');

server.use(morgan('combined'));

server.listen(port, () => {
    console.log(`JSON Server is running on http://localhost:${port} (DB: ${dbFile})`);
});