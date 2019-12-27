const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const Pusher = require('pusher');

const app = express();

const secret = 'mysecretsshhh';

// Import our models
const User = require('../models/User');
const Poll = require('../models/Poll');

mongoose.Promise = global.Promise;
mongoose.connect(
	process.env.MONGODB_URI || `mongodb://localhost:27017/planning-poker`,
	{
		useCreateIndex: true,
		useNewUrlParser: true,
		useUnifiedTopology: true
	}
);

const pusher = new Pusher({
	appId: '922127',
	key: 'e2940972e6de5b249d99',
	secret: '61716bcf135bbd78f37c',
	cluster: 'eu',
	useTLS: true
});

app.use(bodyParser.json());
app.use(
	bodyParser.urlencoded({
		extended: false
	})
);
app.use(cookieParser());
app.use(cors());


//Routes (TODO: move to routes file)

const withAuth = (req, res, next) => {
	const { token } = req.cookies;

	if (!token) {
		res.status(401).send('Unauthorized: No token provided');
	} else {
		jwt.verify(token, secret, function(err, decoded) {
			if (err) {
				res.status(401).send('Unauthorized: Invalid token');
			} else {
				req.email = decoded.email;
				next();
			}
		});
	}
};


app.get('/api/checkToken', withAuth, (req, res) => {
  // res.sendStatus(200);
});


app.post('/api/register', (req, res) => {
	const { email, password } = req.body;
	const user = new User({ email, password });

	user.save(err => {
		if (err) {
			res.status(500).send('Error registering new user.');
		} else {
			res.status(200).send('Welcome to planning poker!');
		}
	});
});

app.post('/api/authenticate', (req, res) => {
	const { email, password } = req.body;
	console.log(req.body);
	User.findOne({ email }, (err, user) => {
		if (err) {
			console.error(err);
			res.status(500).json({
				error: 'Internal server error.'
			});
		} else if (!user) {
			res.status(401).json({
				error: 'Incorrect email or password'
			});
		} else {
			user.isCorrectPassword(password, (err, same) => {
				if (err) {
					res.status(500).json({
						error: 'Internal server error'
					});
				} else if (!same) {
					res.status(401).json({
						error: 'Incorrect email or password'
					});
				} else {
					const payload = { email };
					const token = jwt.sign(payload, secret, {
						expiresIn: '1h'
					});

					res.cookie('token', token, { httpOnly: true }).sendStatus(200);
				}
			});
		}
	});
});

app.get(`/api/polls`, withAuth, async (req, res) => {
	try {
		let polls = await Poll.find();
		if (polls) return res.status(200).send(polls);
	} catch (error) {
		throw error;
	}
});

app.get('/api/poll/:pollId', async (req, res) => {
	let { pollId } = req.params;
	try {
		let poll = await Poll.findById(req.params.pollId);
		if (poll) return res.status(200).send(poll);
	} catch (error) {
		throw error;
	}
});

app.post('/api/poll/:pollId/vote', async (req, res, next) => {
	let { choice } = req.body;
	let { pollId } = req.params;
	// let identifier = `choices.${choice}.votes`;

	console.log('params are ', req.body, req.params);
	// try {
	// 	await Poll.update(
	// 		{ _id: pollId },
	// 		{ $inc: { [identifier]: 1 } }
	// 	);

	// 	return res.status(201).send({ error: false });
	// } catch (error) {
	// 	throw error;
	// }
});


if (process.env.NODE_ENV === 'production') {
	app.use(express.static('client/build'));

	const path = require('path');
	app.get('*', (req, res) => {
		res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
	});
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	console.log(`app running on port: ${PORT}`);
});
