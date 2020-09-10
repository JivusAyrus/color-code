const fs = require('fs');
const fetch = require('node-fetch');
const express = require("express");
const cors = require("cors");
const body = require("body-parser");
const jwt = require("express-jwt");
const jwks = require("jwks-rsa");

const port = process.env.PORT || 8180;

const app = express();
app.use(express.json())
app.use(cors());
app.use(body.urlencoded({ extended: false }));
app.use(body.json());


const adminSecret = process.env.ADMIN_SECRET || "cuerate";

const colorKafkaServer = process.env.COLOR_KAFKA_SERVER || "http://localhost:8181";
const stitchServer = process.env.STITCH_SERVER || "http://localhost:8182";
const ocrServer = process.env.OCR_SERVER || "http://localhost:5000";

const PROCESSING_ERROR = new Error("Something went wrong in our server while processing your request");

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

const proxyCall = (url, options) => {
	return fetch(url, options)
	.then(response => {
		if (!response.status || response.status != 200) {
			throw PROCESSING_ERROR;
		}
		return response.json();
	}).then(body => {
		console.log("body: ", body);
		return { 
			status: 200,
			json: body
		};
	})
};

app.post("/code-video", jwtCheck, (req, res) => {
	const userId = req.user.sub || "";
	const language = req.body.language;
	const codeContent = req.body.codeContent ;
	const theme = req.body.theme;

	// call to color-kafka.js server
	fetchOptions = {
		method: "POST",
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({userId, language, codeContent, theme})
	}
	proxyCall(colorKafkaServer + "/get-code-video", fetchOptions).then(response => {
		console.log(response);
		return res
			.status(response.status)
			.json(response.json)

	}).catch(err => {
		console.error(err);
		return res.status(500).json(err.message);
	});
});

app.post("/stitch-video", jwtCheck, (req, res) => {
	console.log(req.user);
	const userId = req.user.sub || "";
	const postId = req.body.postId || "";
	const threadId = req.body.threadId|| "";
	const codevideoObjectName = req.body.codevideoObjectName || "";
	const usermediaObjectName = req.body.usermediaObjectName || "";

	// call to stich video server with moviepy
	fetchOptions = {
		method: "POST",
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({ userId, postId, threadId, codevideoObjectName, usermediaObjectName })
	}
	proxyCall(stitchServer + "/upload-complete", fetchOptions).then(response => {
		console.log(response);
		return res
			.status(response.status)
			.json(response.json)
	}).catch(err => {
		console.error(err);
		return res.status(500).json(err.message);
	});
});

app.post("/publish", jwtCheck, (req, res) => { 
	const threadId = req.body.threadId || "";

	// call to stitchServer to trigger publish
	fetchOptions = {
		method: "POST",
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({ threadId })
	}
	proxyCall(stitchServer + "/ready-to-publish", fetchOptions).then(response => {
		console.log(response);
		return res
			.status(response.status)
			.json(response.json)
	}).catch(err => {
		console.error(err);
		return res.status(500).json(err.message);
	});
});

app.post("/ocr", jwtCheck, (req, res) => {
	const photoObjectName = req.body.photoObjectName;
	const fetchOptions = {
		method: "POST",
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ photoObjectName })
	};
	proxyCall(ocrServer + "/get-code-from-image", fetchOptions).then(response => {
		console.log(response);
		return res 
		        .status(response.status)
		        .json(response.json)
	}).catch(err => {
		console.error(err);
		return res.status(500).json(err.message);
	}); 
	//const response = proxyCall(ocrServer + "/get-code-from-image", fetchOptions);
	//res.status(response.status).json(response.json);
});


app.listen(port, () => {
	console.log("Listening on port ", port);
})

