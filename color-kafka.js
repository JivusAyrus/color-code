iconst fs = require('fs');
const fetch = require('node-fetch');
const { Kafka } = require('kafkajs');
const express = require('express');
const cors = require('cors');
const async = require('async');

const port = process.env.PORT || 8181;
const kafkaAddress = process.env.KAFKA_ADDRESS || "localhost:9092";
const colorApiEndpoint = process.env.COLOR_API_ENDPOINT || "localhost:3000";

const app = express();
app.use(express.json())
app.use(cors());

const kafka = new Kafka({
    clientId: 'my-app',
    brokers: [kafkaAddress]
})

const producer = kafka.producer();

const graphqlEndpoint = process.env.GRAPHQL_ENDPOINT || "https://cuerated.herokuapp.com/v1/graphql";
const adminSecret = process.env.ADMIN_SECRET || "jumla@2020";

const SUPPORTED_LANGUAGES = [
    "batch",
    "c",
    "c++",
    "clojure",
    "css",
    "dockerfile",
    "go",
    "html",
    "jade",
    "java",
    "javascript",
    "javascriptreact",
    "json",
    "markdown",
    "objective-c",
    "perl",
    "php",
    "powershell",
    "properties",
    "python",
    "r",
    "ruby",
    "rust",
    "scss",
    "shellscript",
    "sql",
    "swift",
    "typescript",
    "typescriptreact",
    "xml",
    "yaml",
]

const SUPPORTED_THEMES = [
	'abyss',
	'dark_vs',
	'light_vs',
	'hc_black',
	'dark_plus',
	'light_plus',
	'kimbie_dark',
	'monokai',
	'monokai_dimmed',
	'quietlight',
	'red',
	'solarized_dark',
	'solarized_light',
	'tomorrow_night_blue'
]

function checkInvalidData(language, theme) {
	let errorResponse = null;
	if (!SUPPORTED_LANGUAGES.includes(language)) {
		errorResponse = "unsupported code language found"
	} else if (!SUPPORTED_THEMES.includes(theme)) {
		errorResponse = "invalid theme passed"
	}
	return errorResponse
}
	

app.post("/get-code-video", (req, res) => {
	// call to generate presigned url from minio (logic here)
	const userId = req.body.userId || "";
	const codeLanguage = req.body.language || "";
	const theme = req.body.theme || "dark_vs.json";
	let codeContent = req.body.codeContent || "";
	
	const invalidResponse = checkInvalidData(codeLanguage, theme);
	if (invalidResponse != null) {
		console.error(invalidResponse);
		return res.status(400).json({
			"status": "error",
			"response": invalidResponse
		})
	}

	async.waterfall([
		function (callback) {
			callback(null, userId, codeLanguage, theme, codeContent);
		},
		generateVsColorCodes,
		addVideoStatus,
		toKafka
	], function (err, videoStatusId) {
		if (err) {
			console.error(err);
			return res.status(500).json({
				status: "error",
				response: err.message
			})
		}
		console.log("Video status id: ", videoStatusId);
		return res.json({
			status: "success",
			response: {
				videoStatusId
			}
		})
	});
});

app.listen(port, () => {
	console.log("Listening on port ", port);
})


function generateVsColorCodes(userId, language, theme, codeContent, callback) {
    console.log("::generateVideo::");
    console.log(userId, language, theme, codeContent, callback);

    const payload = JSON.stringify({
        code: codeContent,
	theme: theme,
	language: language
    });
    console.log("payload: ", payload);

    fetch('http://${colorApiEndpoint}/color-codes', {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            'Accept': '*/*'
        },
        body: payload
    }).then(response => {
		if (!response.status || response.status != 200) {
			const err = new Error("received non-200 http status code while generating video color code");
			throw err;
		}
		return response.json();
	}).then(body => {
		console.log("body: ", body);
		return callback(null, userId, body);
	});
}

function addVideoStatus(userId, colorCodes, callback) {
    const query = "mutation CodeVideoStatusMutation($status: Boolean = false, $user_id: String) { insert_code_video_status_one(object: {user_id: $user_id, status: $status}) { id object_name status user_id } }"
    const variables = {
        status: false,
        user_id: userId
    }
    const headers = {
        "content-type": "application/json",
	"x-hasura-admin-secret": adminSecret
    }
    fetch(graphqlEndpoint, {
	method: "POST",
	headers: headers,
        body: JSON.stringify({
		query,
		variables
	})
    }).then(response => {
	    if (!response.status || response.status != 200) {
			const error = new Error("received non-200 http status code while creating video status id");
			return callback(error);
		}
		response.json().then(body => {
			console.log("body: ", body);
			const videoStatusObject = body.data.insert_code_video_status_one;
			console.log("video status object: ", videoStatusObject);
			return callback(null, videoStatusObject.id, userId, colorCodes);
		});
	});
}


function toKafka(videoStatusId, userId, colorCodes, callback) {
	console.log("::toKafka::");
	console.log(videoStatusId, userId, colorCodes, callback);
    producer.connect()
	.then(() => 
	    producer.send({
			topic: 'color',
			messages: [{
			    key: JSON.stringify({
			       	videoStatusId,
					userId
		    	}),
			    value: JSON.stringify(colorCodes),
			}],
	    })
	).then(() => {
	    console.log(`Successfully inserted video status of #${videoStatusId} belonging to ${userId} to kafka`);
	    return producer.disconnect();
	}).then(() => {
		return callback(null, videoStatusId);
	}).catch(err => {
		return callback(err);
	});
}

