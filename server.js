const jsonServer = require('json-server');
const path = require('path');
const morgan = require('morgan');
const crypto = require('crypto');


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
const router = jsonServer.router(path.join(__dirname, 'db', dbFile), { id: '_id' });

const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use((req, res, next) => {
    const db = router.db; // lowdb instance
    const collection = req.path.split('/')[1];
    if (collection && !db.has(collection).value()) {
        db.set(collection, []).write();
    }
    console.log(`${req.method} ${req.path}`);
    next();
});

server.use((req, res, next) => {
    const { pageIndex, pageSize, paginated, ...rest } = req.query;
    // Only handle GET requests to collection endpoints with paginated param
    const pathParts = req.path.split('/').filter(Boolean);

    if (
        req.method === 'GET' &&
        paginated &&
        pathParts.length === 1 // Only match /collection, not /collection/:id
    ) {
        const collection = pathParts[0];
        const db = router.db;
        let items = db.get(collection);

        // Apply filters if any
        Object.keys(rest).forEach(key => {
            items = items.filter(item => String(item[key]) === String(rest[key]));
        });
        const total = items.size().value();
        const page = parseInt(pageIndex, 10) || 0;
        const size = parseInt(pageSize, 10) || 10;
        const data = items.value().slice(page * size, (page + 1) * size);
        return res.json({ data, total });
    }
    console.log(`${req.method} ${req.path}`);
    next();
});

server.get('/:collection/:id', (req, res, next) => {
    const { collection, id } = req.params;
    const db = router.db;
    const item = db.get(collection).find({ _id: id }).value();
    if (!item) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.json(item);
});



server.use(jsonServer.bodyParser);

server.use((req, res, next) => {
    if (req.method === 'POST') {
        if (!req.body._id) {
            req.body._id = crypto.randomBytes(12).toString('hex');
        }
        req.body.createdAt = new Date().toISOString();
        req.body.updatedAt = req.body.createdAt;
    }
    if (req.method === 'PUT' || req.method === 'PATCH') {
        console.log('Updating updatedAt timestamp');
        req.body.updatedAt = new Date().toISOString();
    }
    next();
});

server.patch('/:collection/:id', (req, res, next) => {
    console.log('PATCH request received');
    const { collection, id } = req.params;
    const db = router.db;
    const item = db.get(collection).find({ _id: id }).value();
    if (!item) {
        return res.status(404).json({ error: 'Not found' });
    }
    db.get(collection).find({ _id: id }).assign(req.body).write();
    const updated = db.get(collection).find({ _id: id }).value();
    res.json(updated);
});



server.delete('/:collection/:id', (req, res, next) => {
    const { collection, id } = req.params;
    const db = router.db;
    const item = db.get(collection).find({ _id: id }).value();
    if (!item) {
        return res.status(404).json({ error: 'Not found' });
    }
    db.get(collection).remove({ _id: id }).write();
    res.status(204).end();
});

server.use(morgan('combined'));
server.use(router);
server.listen(port, () => {
    console.log(`JSON Server is running on http://localhost:${port} (DB: ${dbFile})`);
});