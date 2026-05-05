require('./utils.js');
require('dotenv').config(); 
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const bcrypt = require('bcrypt');   
const saltRounds = 12;

const app = express();

const Joi = require("joi");
// const mongoSanitizer = require('mongo-sanitizer').default;
//import mongoSanitizer from 'mongo-sanitizer';
const mongoSanitize = require('express-mongo-sanitize');


const PORT = process.env.PORT || 3000;
const expireTime = 24 * 60 * 60 * 1000; //expires after 1 day  (hours * minutes * seconds * millis)

/* secret information section */
// const mongodb_host = process.env.MONGODB_HOST;
// const mongodb_user = process.env.MONGODB_USER;
// const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_user_database = process.env.MONGODB_USER_DATABASE;
const mongodb_session_database = process.env.MONGODB_SESSION_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;
/* END secret section */

// const { database } = include('databaseConnection');

// const userCollection = database.db(process.env.MONGODB_USER_DATABASE).collection('users');

const client = require('./databaseConnection');
const userCollection = client.db(mongodb_user_database).collection('users');

app.use(express.urlencoded({extended: false}));
app.use(express.json());

// app.use(mongoSanitize(
//     { replaceWith: '_'}
// ));

// // Hack for express 5.x not setting req.query as writable 
// app.use((req, _res, next) => {
// 	Object.defineProperty(req, 'query', {
// 		...Object.getOwnPropertyDescriptor(req, 'query'),
// 		value: req.query,
// 		writable: true,
// 	});

// 	next();
// })

// app.use(mongoSanitize(
//     {replaceWith: '%'}
// ));

app.use(mongoSanitize());

// var mongoStore = MongoStore.create({
// 	mongoUrl: `mongodb://${mongodb_user}:${mongodb_password}@${mongodb_host}/${mongodb_session_database}`,
// 	crypto: {
// 		secret: mongodb_session_secret
// 	}
// });

// const mongoStore = MongoStore.create({
//     mongoUrl: process.env.MONGODB_URI,
//     crypto: {
//         secret: mongodb_session_secret
//     }
// });

const mongoStore = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    dbName: mongodb_session_database,
    crypto: {
        secret: mongodb_session_secret
    }
});

app.use(session({ 
    secret: node_session_secret,
	store: mongoStore, //default is memory store 
	saveUninitialized: false, 
	resave: false
}
));

app.get('/nosql-injection', (req,res) => {
    res.send(`
        noSQL injection example:
        <form action='/nosql-injection' method='post'>
            <input name='user' type='text' placeholder='user'>
            <button>Submit</button>
        </form>
        <div style='font-family:Helvetica, arial, sans-serif;'>
            You can use <a href="https://www.postman.com/">Postman <img src="Postman.png" style="height:45px;"/></a> to bypass this form page and perform a NoSQL injection attack.
            <br>
            <br>
            URL: <code>/nosql-injection</code> <br>
            Method: <code>POST</code> <br>
            Body (raw: JSON): <code> { "user": "name" } </code> <br>
            <em>(normal behaviour)</em> <br>
            <br>
            <strong>OR</strong> <br>
            <br>
            Body (raw: JSON): <code>{ "user": {"$ne": "name"} } </code><br>
            <em>(NoSQL injection attack)</em> <br>
            <img src="PostmanSS.png"/>
        </div>
        `)
});

app.post('/nosql-injection', async (req,res) => {
	var username = req.body.user;

	if (!username) {
		res.send(`<h3>no user provided - try /nosql-injection?user=name</h3> <h3>or /nosql-injection?user[$ne]=name</h3>`);
		return;
	}
	console.log("user: ",username);

	const schema = Joi.string().max(20).required();
	const validationResult = schema.validate(username);

	//If we didn't use Joi to validate and check for a valid URL parameter below
	// we could run our userCollection.find and it would be possible to attack.
	// A URL parameter of user[$ne]=name would get executed as a MongoDB command
	// and may result in revealing information about all users or a successful
	// login without knowing the correct password.
	if (validationResult.error != null) {  
        console.log(validationResult.error);
        res.send("<h1 style='color:darkred;'>A NoSQL injection attack was detected!!</h1>");
        return;
	}	

	const result = await userCollection.find({username: username}).project({username: 1, password: 1, _id: 1}).toArray();

	console.log(result);

    res.send(`<h1>Hello ${username}</h1>`);
});


// Routes
app.get('/', (req, res) => {
    if (!req.session.authenticated) {
        return res.send(`
            <h3>Welcome to the Home Page</h3>
            <button><a href='/signup'>Sign Up</a></button><br>
            <button><a href='/login'>Log In</a></button>
        `);
    }

    res.send(`
        <h3>Hello, ${req.session.name}!</h3>
        <button><a href='/members'>Members</a></button><br><br>
        <button><a href='/logout'>Logout</a></button>
    `);
});

app.get('/signup', (req, res) => {
    res.send(`
        <h1>Sign Up</h1>

        <form action="/signup" method="post">
            <input name="name" placeholder="Name"><br>
            <input name="email" placeholder="Email"><br>
            <input name="password" type="password" placeholder="Password"><br>
            <button>Sign Up</button>
        </form>

        <a href="/">Back</a>
    `);
});

app.post('/signup', async (req,res) => {
    const {name, email, password} = req.body;

    //Joi validation for the signup form
    const schema = Joi.object(
        {
            name: Joi.string().max(30).required(),
            email: Joi.string().email().required(),
            password: Joi.string().max(30).required()
        });
    
    const validationResult = schema.validate({name, email, password});

    if (validationResult.error) {
        return res.send(`
            <h3>Missing or invalid input</h3>
            <a href='/signup'>Try again</a>
            `);
    }

    const existingUser = await userCollection.findOne({email});

    if (existingUser) {
        return res.send(`
            <h3>User already exists</h3>
            <a href='/signup'>Try again</a>
            `);
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await userCollection.insertOne({
        name, 
        email,
        password: hashedPassword
    });

    // Creating session
    req.session.authenticated = true;
    req.session.name = name;
    req.session.email = email;

    res.redirect('/members');
});

app.get('/login', (req,res) => {
    res.send(`
        <h1>Login</h1>
        <form action='/login' method='post'>
            <input name='email' placeholder='email'><br>
            <input name='password' type='password' placeholder='Password'><br>
            <button>Login</button>
        </form>
    `);
});

app.post('/login', async (req,res) => {
    const {email, password} = req.body;

    const schema = Joi.object(
        {
            email: Joi.string().email().required(),
            password: Joi.string().required()
        });
    
    const validationResult = schema.validate({email, password});

    if (validationResult.error) {
        return res.send(`
            <h3>Invalid input</h3>
            <a href='/login'>Try again</a>
            `);
    }

    const user = await userCollection.findOne({email});

    if (!user) {
        return res.send(`
            <h3>User not found</h3>
            <a href='/login'>Try again</a>
            `);
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
        return res.send(`
            <h3>Incorrect password</h3>
            <a href='/login'>Try again</a>
            `);
    }

    req.session.authenticated = true;
    req.session.name = user.name;
    req.session.email = user.email;

    res.redirect('/members');
});

app.get('/members', (req,res) => {
    if (!req.session.authenticated) {
        return res.redirect('/');
    }

    const images = ['/img1.jpg', '/img2.jpg', '/img3.jpg'];
    const randomImage = images[Math.floor(Math.random() * images.length)];

    res.send(`
        <h1>Welcome, ${req.session.name}!</h1>
        <img src='${randomImage}' style='width:300px;'><br><br>
        <button><a href='/logout'>Logout</a></button>
    `);
});

app.get('/logout', (req,res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

app.use(express.static(__dirname + "/public"));

app.use((req,res) => {
	res.status(404);
	res.send(`
        <h1>404 - Not Found</h1>
        <p>The page you are looking for does not exist.</p>
        <button><a href='/'>Go to Home</a></button>
    `);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});