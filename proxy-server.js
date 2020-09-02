const fs = require('fs');
const fetch = require('node-fetch');
const express = require("express");
const cors = require("cors");
const jwt = require("express-jwt");
const jwks = require("jwks-rsa");

const port = process.env.PORT || 8080;

const app = express();
app.use(express.json())
app.use(cors());

const adminSecret = process.env.ADMIN_SECRET || "cuerate";
const colorKafkaServer = process.env.COLOR_KAFKA_SERVER || "http://localhost:8181/";

const jwtCheck = jwt({
    secret: jwks.expressJwtSecret({
        cache: true,
		rateLimit: true,
		jwksRequestsPerMinute: 5,
		jwksUri: "https://cuerate.us.auth0.com/.well-known/jwks.json",
    }),
	issuer: "https://cuerate.us.auth0.com/",
	algorithms: ["RS256"],
});

app.post("/code-video",  (req, res) => {
    // call to color-kafka.js server
	fetch(colorKafkaServer + "get-code-video", {
		method: "POST",
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			userId: "google-oauth2|115044556237739104594",
			language: "javascript",
			codeContent: "console.log('hello world');"
		})
	}).then(response => {
		if (response.statusCode != 200) {
			throw new Error("Something went wrong in our server while processing your reqest");
		}
		return response.json();
	}).then(videoStatusId => {
	    res.json({
			status: "success",
			response: {
				videoStatusId
			}
		});
	}).catch(err => {
		console.error(err);
		res.json({
			status: "error",
			response: err.message
		}, 500)
	});
});

app.post("/stitch-video", jwtCheck, (req, res) => {
	// call to stich video server with moviepy
	res.end("stitch-video");
});

app.post("/presigned-url", jwtCheck, (req, res) => {
	// call to generate presigned url from minio (logic here)
	res.end("presigned-url");
});


app.listen(port, () => {
	console.log("Listening on port ", port);
})

