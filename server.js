require('dotenv').config();
const express = require('express');
const morgan = require('morgan')

const app = express();
app.use(express.json());
app.use(morgan('tiny'))
app.get('/', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server listening on ${port}`));
