const fs = require('fs')
const fetch = require('node-fetch')
request = require('request');
const { Kafka } = require('kafkajs')

const kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['localhost:9092']
})

const producer = kafka.producer()

const adminSecret = process.env.ADMIN_SECRET || "cuerate";

fs.readFile('input.js', (err, data) => {
    if (err) throw err;
    var code = data.toString()
    //console.log(code)

    request.post(
        'http://localhost:3000/javascript', {
            json: {
                code : code,
		theme:"Kimbie_dark.tmTheme",
		language:"javascript"
            }
        },
        function(error, response, body) {
            if (!error && response.statusCode == 200) {
      //          console.log(body);
		const userId = "google-oauth2|115044556237739104594";
		addVideoStatus(userId, async function(err, data) {
		    if (err) {
		        console.error(err);
		    } else {
			await toKafka(data.id, userId, body);
		    }
		});
            }
        }
    );
})

async function addVideoStatus(userId, cb) {
    const query = "mutation CodeVideoStatusMutation($status: Boolean = false, $user_id: String) { insert_code_video_status_one(object: {user_id: $user_id, status: $status}) { id object_name status user_id } }"
    const variables = {
        status: false,
        user_id: userId
    }
    const headers = {
        "content-type": "application/json",
	"x-hasura-admin-secret": adminSecret
    }
    request.post(
        {
        headers: headers,
        url: url,
        body: JSON.stringify(payload),
        function (error, response, body) {
	    if (error || response.statusCode !==200) {
	        return cb(error || {statusCode: response.statusCode})
	    }
            console.log(body);
	    const data = JSON.parse(body).data.insert_code_video_status_one;
	    cb(null, data)
        }
    );
}

async function toKafka(id, user_id, body){
    await producer.connect()
    await producer.send({
	topic: 'color',
	messages: [
		{
		    key: JSON.stringify({
		        id: status_id,
			user_id: user_id
		    }),
		    value: JSON.stringify(body),
		}
	],
    })
    console.log("Successfully inserted to kafka")
    await producer.disconnect()
}
